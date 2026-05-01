"""
Инициализация и запуск Telegram-бота.
"""
import logging
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties

from app.config import settings
from app.bot.handlers import router

logger = logging.getLogger(__name__)


def create_bot() -> tuple[Bot, Dispatcher]:
    bot = Bot(
        token=settings.TELEGRAM_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN),
    )
    dp = Dispatcher()
    dp.include_router(router)
    return bot, dp


async def start_polling():
    """Запуск бота в режиме polling (для Railway/Render)."""
    bot, dp = create_bot()
    logger.info("Запускаю Telegram-бота...")
    await dp.start_polling(bot, allowed_updates=["message", "callback_query"])
