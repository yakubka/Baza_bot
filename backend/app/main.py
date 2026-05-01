"""
Точка входа: FastAPI приложение + Telegram-бот.
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Глобальный экземпляр бота для polling
_bot_task = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация при старте, cleanup при остановке."""
    global _bot_task

    # Инициализируем БД
    logger.info("Инициализирую базу данных...")
    await init_db()

    # Запускаем бота в фоне (если задан токен)
    if settings.TELEGRAM_TOKEN:
        from app.bot.bot import start_polling
        _bot_task = asyncio.create_task(start_polling())
        logger.info("Telegram-бот запущен")
    else:
        logger.warning("TELEGRAM_TOKEN не задан — бот не запущен")

    yield

    # Остановка
    if _bot_task:
        _bot_task.cancel()
        try:
            await _bot_task
        except asyncio.CancelledError:
            pass
    logger.info("Приложение остановлено")


app = FastAPI(
    title="BAZA Development Bot API",
    description="API для управления базой знаний AI-бота BAZA Development",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.ADMIN_FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "BAZA Bot API"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=False,
    )
