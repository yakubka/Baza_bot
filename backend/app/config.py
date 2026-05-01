from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    TELEGRAM_TOKEN: str = ""
    GEMINI_API_KEY: str = "sk-XbaK7iXdvjUxcMjK7Y1qEBe2Ord1ew2N"
    GEMINI_BASE_URL: str = "https://api.proxyapi.ru/google"
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_EMBEDDING_MODEL: str = "models/embedding-001"
    DATABASE_URL: str = "sqlite+aiosqlite:///./baza_bot.db"
    CHROMA_PATH: str = "./chroma_db"
    ADMIN_SECRET: str = "change-me-super-secret-key"
    ADMIN_FRONTEND_URL: str = "http://localhost:3000"

    # Статические ответы для частых запросов
    MORTGAGE_LINK: str = (
        "https://docs.google.com/spreadsheets/d/11vRsRyKr9iAw-dtHYSkfCGoA2WM4j9ZG6SdsJ7a1uXA/"
        "edit?gid=1861430795#gid=1861430795"
    )
    INSTALLMENT_LINK: str = "https://realtors.baza.bz/ekb"
    OBJECTIONS_LINK: str = (
        "https://docs.google.com/document/d/196vtYXO5aTcQt6TFQPTAQ7UhmBxQhaNDyPco0s8qiXs/"
        "edit?tab=t.0"
    )
    CALL_CENTER_PHONE: str = "305-05-05"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
