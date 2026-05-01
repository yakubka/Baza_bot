"""
REST API для административной панели.
"""
import os
import uuid
import logging
import asyncio
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.config import settings
from app.database import get_db, Project, Document
from app.rag import ingestion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")

UPLOADS_DIR = Path("./uploads")
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt", "md", "xlsx", "xls"}


# ─── Auth ─────────────────────────────────────────────────────────────────────

def verify_admin(x_admin_secret: str = Header(...)):
    if x_admin_secret != settings.ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Неверный секретный ключ")
    return True


# ─── Pydantic схемы ───────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    city: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    city: Optional[str]
    documents_count: int = 0

    class Config:
        from_attributes = True


class DocumentResponse(BaseModel):
    id: int
    project_id: Optional[int]
    project_name: Optional[str]
    filename: str
    original_name: str
    file_type: str
    status: str
    error_message: Optional[str]
    chunks_count: int

    class Config:
        from_attributes = True


# ─── Projects ─────────────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()

    # Считаем документы для каждого проекта
    response = []
    for p in projects:
        docs_result = await db.execute(
            select(Document).where(Document.project_id == p.id)
        )
        docs_count = len(docs_result.scalars().all())
        response.append(
            ProjectResponse(
                id=p.id,
                name=p.name,
                slug=p.slug,
                description=p.description,
                city=p.city,
                documents_count=docs_count,
            )
        )
    return response


@router.post("/projects", response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    # Проверяем уникальность slug
    existing = await db.execute(select(Project).where(Project.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Проект со slug '{data.slug}' уже существует")

    project = Project(
        name=data.name,
        slug=data.slug,
        description=data.description,
        city=data.city,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id,
        name=project.name,
        slug=project.slug,
        description=project.description,
        city=project.city,
        documents_count=0,
    )


@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Проект не найден")

    # Удаляем документы из векторного хранилища
    docs_result = await db.execute(
        select(Document).where(Document.project_id == project_id)
    )
    for doc in docs_result.scalars().all():
        try:
            ingestion.delete_document_from_vectorstore(doc.id)
        except Exception as e:
            logger.warning(f"Не удалось удалить документ {doc.id} из векторного хранилища: {e}")

    await db.delete(project)
    await db.commit()
    return {"message": f"Проект '{project.name}' удалён"}


# ─── Documents ────────────────────────────────────────────────────────────────

@router.get("/documents", response_model=List[DocumentResponse])
async def list_documents(
    project_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    query = select(Document).order_by(Document.created_at.desc())
    if project_id is not None:
        query = query.where(Document.project_id == project_id)

    result = await db.execute(query)
    docs = result.scalars().all()

    response = []
    for doc in docs:
        project_name = None
        if doc.project_id:
            project = await db.get(Project, doc.project_id)
            project_name = project.name if project else None
        response.append(
            DocumentResponse(
                id=doc.id,
                project_id=doc.project_id,
                project_name=project_name,
                filename=doc.filename,
                original_name=doc.original_name,
                file_type=doc.file_type,
                status=doc.status,
                error_message=doc.error_message,
                chunks_count=doc.chunks_count,
            )
        )
    return response


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    project_id: Optional[int] = Form(None),
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    # Проверяем расширение
    original_name = file.filename or "unknown"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Неподдерживаемый тип файла. Разрешены: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Сохраняем файл
    unique_name = f"{uuid.uuid4()}_{original_name}"
    file_path = UPLOADS_DIR / unique_name

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    # Получаем данные проекта
    project_slug = None
    project_name = None
    if project_id:
        project = await db.get(Project, project_id)
        if project:
            project_slug = project.slug
            project_name = project.name

    # Создаём запись в БД
    doc = Document(
        project_id=project_id,
        filename=unique_name,
        original_name=original_name,
        file_type=ext,
        status="processing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Запускаем обработку в фоне
    asyncio.create_task(
        _process_document_background(
            doc_id=doc.id,
            file_path=str(file_path),
            file_type=ext,
            original_name=original_name,
            project_slug=project_slug,
            project_name=project_name,
        )
    )

    return {
        "id": doc.id,
        "original_name": original_name,
        "status": "processing",
        "message": "Документ загружен и обрабатывается",
    }


async def _process_document_background(
    doc_id: int,
    file_path: str,
    file_type: str,
    original_name: str,
    project_slug: Optional[str],
    project_name: Optional[str],
):
    """Фоновая задача: индексация документа."""
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        doc = await db.get(Document, doc_id)
        if not doc:
            return
        try:
            chunks_count = ingestion.ingest_document(
                file_path, file_type, doc_id, original_name, project_slug, project_name,
            )
            doc.status = "indexed"
            doc.chunks_count = chunks_count
        except Exception as e:
            logger.error(f"Ошибка индексации документа {doc_id}: {e}")
            doc.status = "error"
            doc.error_message = str(e)
        await db.commit()


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: int,
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    doc = await db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Документ не найден")

    # Удаляем из ChromaDB
    try:
        ingestion.delete_document_from_vectorstore(document_id)
    except Exception as e:
        logger.warning(f"Не удалось удалить из ChromaDB: {e}")

    # Удаляем файл
    try:
        file_path = UPLOADS_DIR / doc.filename
        if file_path.exists():
            os.remove(file_path)
    except Exception as e:
        logger.warning(f"Не удалось удалить файл: {e}")

    await db.delete(doc)
    await db.commit()
    return {"message": f"Документ '{doc.original_name}' удалён"}


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin),
):
    projects_result = await db.execute(select(Project))
    projects_count = len(projects_result.scalars().all())

    docs_result = await db.execute(select(Document))
    all_docs = docs_result.scalars().all()
    docs_count = len(all_docs)
    indexed_count = sum(1 for d in all_docs if d.status == "indexed")
    total_chunks = sum(d.chunks_count for d in all_docs)

    return {
        "projects_count": projects_count,
        "documents_count": docs_count,
        "indexed_documents": indexed_count,
        "total_chunks": total_chunks,
    }
