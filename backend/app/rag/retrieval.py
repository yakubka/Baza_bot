"""
RAG-ретривал с памятью разговора и маршрутизацией частых запросов.
Упрощённый подход: retriever → context → LLM напрямую.
"""
import asyncio
import logging
from typing import Optional
from collections import defaultdict

import google.generativeai as genai
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.schema import HumanMessage, SystemMessage

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Инициализация ────────────────────────────────────────────────────────────

genai.configure(
    api_key=settings.GEMINI_API_KEY,
    transport="rest",
    client_options={"api_endpoint": settings.GEMINI_BASE_URL},
)

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"device": "cpu"},
    encode_kwargs={"normalize_embeddings": True},
)

vectorstore = Chroma(
    collection_name="baza_knowledge",
    embedding_function=embeddings,
    persist_directory=settings.CHROMA_PATH,
)

# Прямой клиент Gemini через ProxyAPI (без LangChain wrapper)
_gemini_model = genai.GenerativeModel(
    model_name=settings.GEMINI_MODEL,
    generation_config=genai.GenerationConfig(
        temperature=0.3,
        max_output_tokens=2048,
    ),
)

# Простая память: user_id → список (role, content)
_histories: dict[int, list[tuple[str, str]]] = defaultdict(list)
MAX_HISTORY = 6  # последних пар


def get_history(user_id: int) -> list[tuple[str, str]]:
    return _histories[user_id][-MAX_HISTORY:]


def add_to_history(user_id: int, question: str, answer: str) -> None:
    _histories[user_id].append(("user", question))
    _histories[user_id].append(("assistant", answer))
    # Обрезаем до MAX_HISTORY пар
    if len(_histories[user_id]) > MAX_HISTORY * 2:
        _histories[user_id] = _histories[user_id][-(MAX_HISTORY * 2):]


def clear_memory(user_id: int) -> None:
    _histories[user_id] = []


# ─── Системный промпт ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Ты — AI-ассистент компании BAZA Development для партнёров-риелторов.
Отвечай ТОЛЬКО на русском языке. Будь профессиональным, конкретным и дружелюбным.

Проекты BAZA Development:
• Екатеринбург (застройщик): ЖК Алиса, Дом Милый Дом (ДМД/ДМД1/ДМД2), ДНК, Каменные Палатки
• Москва (застройщик): ЖК Бестселлер
• Бали (застройщик): Origins, Kedungu
• Агентство (партнёрские): Южные Кварталы, Тёплые Кварталы, Московский Квартал, River Park, Сезоны

Правила:
1. Используй ТОЛЬКО информацию из раздела "Контекст" ниже.
2. Если в контексте нет ответа — честно скажи об этом и предложи обратиться к менеджеру.
3. При вопросах о характеристиках ЖК давай структурированный ответ.
4. Не придумывай данные — только то, что есть в контексте.
5. Максимум 3000 символов в ответе.

Контакты менеджеров:
• Яна Крылосова (Екатеринбург): +7 900 197-44-33, @yanakrylosovaaa
• Алёна Дружинина (Москва): +7 902 809-69-55, @druzhinina_alena
• Колл-центр (сделки): 305-05-05"""


# ─── Маршрутизация ────────────────────────────────────────────────────────────

MORTGAGE_KW = ["ипотек", "кредит на кварти", "льготн ипотек", "семейн ипотек",
               "it-ипотек", "айти ипотек", "военн ипотек", "субсидир", "траншев", "комбо"]
INSTALLMENT_KW = ["рассрочк", "можно в рассрочку", "условия рассрочк", "первоначалк", "срок рассрочк"]
DEAL_KW = ["оформить сделку", "выход на сделку", "электронн регистрац",
           "документы для сделки", "договор брониров", "предварительный договор", " дкп "]
FIXATION_KW = ["зафиксировать", "фиксация клиент", "фиксировать клиент", "закрепить клиент"]
CONTACTS_KW = ["менеджер", "к кому обратиться", "кому позвонить", "контакт", "крылосова", "дружинина"]


def _match(text: str, keywords: list[str]) -> bool:
    t = text.lower()
    return any(k in t for k in keywords)


def get_routing_response(question: str) -> Optional[str]:
    q = question.lower()

    if _match(q, MORTGAGE_KW):
        return (
            "📊 *Ипотечные программы по нашим проектам*\n\n"
            f"👉 [Актуальная таблица программ]({settings.MORTGAGE_LINK})\n\n"
            "Доступны: льготная, семейная, IT-ипотека, стандартная, субсидированная, траншевая, комбо-ставка.\n\n"
            "По вопросам:\n• Екатеринбург: Яна Крылосова @yanakrylosovaaa\n• Москва: Алёна Дружинина @druzhinina_alena"
        )
    if _match(q, INSTALLMENT_KW):
        return (
            "📋 *Условия рассрочки*\n\n"
            f"👉 [Партнёрская страница с условиями]({settings.INSTALLMENT_LINK})\n\n"
            "По вопросам:\n• Яна Крылосова @yanakrylosovaaa\n• Алёна Дружинина @druzhinina_alena"
        )
    if _match(q, DEAL_KW):
        return (
            "📞 *Вопросы по сделке и документам*\n\n"
            f"☎️ Колл-центр: {settings.CALL_CENTER_PHONE}\n\n"
            "Помогут с: оформлением брони, ДКП, пакетом документов, электронной регистрацией."
        )
    if _match(q, FIXATION_KW):
        return (
            "📌 *Фиксация клиента*\n\n"
            "Зафиксировать клиента можно в разделе *«Фиксация»* в мини-приложении.\n\n"
            "По вопросам:\n• Яна Крылосова @yanakrylosovaaa\n• Алёна Дружинина @druzhinina_alena"
        )
    if _match(q, CONTACTS_KW):
        return (
            "📞 *Контакты менеджеров BAZA*\n\n"
            "*Яна Крылосова* — Екатеринбург\n📱 +7 900 197-44-33\n💬 @yanakrylosovaaa\n\n"
            "*Алёна Дружинина* — Москва\n📱 +7 902 809-69-55\n💬 @druzhinina_alena\n\n"
            "*Колл-центр* (сделки): ☎️ 305-05-05"
        )
    return None


# ─── Основная функция ответа ──────────────────────────────────────────────────

async def answer_question(user_id: int, question: str) -> str:
    # 1. Роутинг частых запросов
    routed = get_routing_response(question)
    if routed:
        return routed

    # 2. Получаем релевантные документы из ChromaDB
    try:
        docs = vectorstore.similarity_search(question, k=5)
        context = "\n\n---\n\n".join(
            f"[{doc.metadata.get('project_name', 'Общее')}]\n{doc.page_content}"
            for doc in docs
        ) if docs else "База знаний пуста — документы ещё не загружены."
    except Exception as e:
        logger.error(f"Ошибка поиска в ChromaDB: {e}")
        context = "Не удалось получить данные из базы знаний."

    # 3. Строим историю разговора
    history = get_history(user_id)
    history_text = ""
    if history:
        lines = []
        for role, content in history:
            prefix = "Партнёр" if role == "user" else "Ассистент"
            lines.append(f"{prefix}: {content[:200]}")
        history_text = "\n".join(lines)

    # 4. Строим единый промпт для Gemini
    full_prompt = f"""{SYSTEM_PROMPT}

Контекст из базы знаний:
{context}

{"История разговора:" + chr(10) + history_text if history_text else ""}

Вопрос партнёра: {question}

Ответ:"""

    # 5. Вызываем Gemini синхронно через to_thread (avoid await issue)
    try:
        def _call_gemini():
            resp = _gemini_model.generate_content(full_prompt)
            return resp.text

        answer = await asyncio.to_thread(_call_gemini)
        add_to_history(user_id, question, answer)
        return answer
    except Exception as e:
        logger.error(f"Ошибка Gemini для user {user_id}: {e}")
        return (
            "⚠️ Произошла ошибка при обращении к AI. Попробуйте через несколько секунд.\n\n"
            "По срочным вопросам:\n"
            "• Яна Крылосова @yanakrylosovaaa\n"
            "• Алёна Дружинина @druzhinina_alena"
        )
