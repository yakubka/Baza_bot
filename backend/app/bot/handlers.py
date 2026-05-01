"""
Обработчики Telegram-бота (aiogram 3).
"""
import logging
from aiogram import Router, F
from aiogram.types import Message, ReactionTypeEmoji
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext
from aiogram.utils.chat_action import ChatActionSender

from app.rag.retrieval import answer_question, clear_memory

logger = logging.getLogger(__name__)
router = Router()

WELCOME_TEXT = """👋 Привет! Я AI-ассистент компании **BAZA Development** для партнёров.

Я помогу вам с вопросами по:
• 🏠 Проектам (Алиса, ДМД, Бестселлер, Origins, Kedungu и др.)
• 💰 Агентскому вознаграждению (КВ/АВ)
• 🏦 Ипотечным программам
• 📋 Рассрочке
• 🏗️ Характеристикам и отделке квартир
• 📞 Контактам менеджеров

Просто задайте вопрос! 💬"""

HELP_TEXT = """ℹ️ **Команды:**
• /start — приветствие
• /help — помощь
• /clear — очистить историю разговора
• /contacts — контакты менеджеров

**Примеры вопросов:**
• «Какое АВ по Алисе?»
• «Есть ли ипотека на ДМД2?»
• «Расскажи об отделке в Origins»
• «Как зафиксировать клиента?»"""

CONTACTS_TEXT = """📞 **Контакты партнёрских менеджеров BAZA:**

**Яна Крылосова** — Екатеринбург
📱 +7 900 197-44-33
💬 Telegram: @yanakrylosovaaa
_Лидер партнёрского направления Екатеринбурга_

**Алёна Дружинина** — Москва
📱 +7 902 809-69-55
💬 Telegram: @druzhinina_alena
_Лидер партнёрского направления BAZA_

**Колл-центр** (вопросы по сделкам):
☎️ 305-05-05"""


@router.message(CommandStart())
async def cmd_start(message: Message):
    await message.answer(WELCOME_TEXT, parse_mode="Markdown")


@router.message(Command("help"))
async def cmd_help(message: Message):
    await message.answer(HELP_TEXT, parse_mode="Markdown")


@router.message(Command("contacts"))
async def cmd_contacts(message: Message):
    await message.answer(CONTACTS_TEXT, parse_mode="Markdown")


@router.message(Command("clear"))
async def cmd_clear(message: Message):
    clear_memory(message.from_user.id)
    await message.answer("🗑️ История разговора очищена. Начнём сначала!")


@router.message(F.text)
async def handle_text(message: Message):
    user_id = message.from_user.id
    username = message.from_user.username or message.from_user.full_name or str(user_id)
    question = message.text.strip()

    if not question:
        return

    logger.info(f"Вопрос от @{username} ({user_id}): {question[:100]}")

    # Показываем индикатор "печатает..."
    async with ChatActionSender.typing(bot=message.bot, chat_id=message.chat.id):
        answer = await answer_question(user_id, question)

    # Разбиваем длинные ответы на части (Telegram лимит: 4096 символов)
    parts = [answer[i:i+4000] for i in range(0, len(answer), 4000)]
    for part in parts:
        try:
            await message.answer(part, parse_mode="Markdown")
        except Exception:
            # Если Markdown не парсится — отправляем plain text
            await message.answer(part, parse_mode=None)

    logger.info(f"Ответ для @{username}: {answer[:100]}...")


@router.message()
async def handle_other(message: Message):
    await message.answer(
        "Я понимаю только текстовые сообщения. Пожалуйста, напишите ваш вопрос текстом. 💬",
        parse_mode="Markdown",
    )
