const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "change-me-super-secret-key";

const headers = {
  "Content-Type": "application/json",
  "x-admin-secret": ADMIN_SECRET,
};

export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  city?: string;
  documents_count: number;
}

export interface Document {
  id: number;
  project_id?: number;
  project_name?: string;
  filename: string;
  original_name: string;
  file_type: string;
  status: "pending" | "processing" | "indexed" | "error";
  error_message?: string;
  chunks_count: number;
}

export interface Stats {
  projects_count: number;
  documents_count: number;
  indexed_documents: number;
  total_chunks: number;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/api/projects`, { headers });
  if (!res.ok) throw new Error("Ошибка загрузки проектов");
  return res.json();
}

export async function createProject(data: {
  name: string;
  slug: string;
  description?: string;
  city?: string;
}): Promise<Project> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Ошибка создания проекта");
  }
  return res.json();
}

export async function deleteProject(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/projects/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Ошибка удаления проекта");
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function fetchDocuments(projectId?: number): Promise<Document[]> {
  const url = projectId
    ? `${API_URL}/api/documents?project_id=${projectId}`
    : `${API_URL}/api/documents`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Ошибка загрузки документов");
  return res.json();
}

export async function uploadDocument(
  file: File,
  projectId?: number
): Promise<{ id: number; original_name: string; status: string }> {
  const formData = new FormData();
  formData.append("file", file);
  if (projectId) formData.append("project_id", String(projectId));

  const res = await fetch(`${API_URL}/api/documents/upload`, {
    method: "POST",
    headers: { "x-admin-secret": ADMIN_SECRET },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Ошибка загрузки файла");
  }
  return res.json();
}

export async function deleteDocument(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/documents/${id}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Ошибка удаления документа");
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_URL}/api/stats`, { headers });
  if (!res.ok) throw new Error("Ошибка загрузки статистики");
  return res.json();
}
