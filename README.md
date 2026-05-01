# BAZA Development — AI-бот для партнёров

Telegram-бот с RAG (базой знаний) для партнёров-риелторов BAZA Development.

## Архитектура

```
baza-bot/
├── backend/          # Python FastAPI + aiogram + LangChain
│   ├── app/
│   │   ├── bot/      # Telegram-бот (aiogram 3)
│   │   ├── rag/      # RAG: ingestion (PDF/DOCX/OCR) + retrieval
│   │   └── api/      # REST API для админ-панели
│   └── Dockerfile
├── admin/            # Next.js + Shadcn UI
│   └── src/app/
│       ├── page.tsx          # Дашборд
│       ├── projects/         # Управление ЖК
│       └── documents/        # Загрузка документов
└── docker-compose.yml
```

## Технологии

| Компонент | Технология |
|-----------|-----------|
| LLM | Gemini 2.0 Flash (via ProxyAPI) |
| Embeddings | Google Generative AI Embeddings |
| Vector Store | ChromaDB |
| OCR | Gemini Vision (для PDF-изображений) |
| Bot Framework | aiogram 3 |
| Backend | FastAPI + SQLAlchemy + SQLite |
| Admin UI | Next.js 15 + Shadcn UI + Tailwind |
| Hosting | Railway / Render |

## Быстрый старт (локально)

### 1. Бэкенд

```bash
cd backend
cp .env.example .env
# Заполните .env своим TELEGRAM_TOKEN
```

Установка зависимостей:
```bash
pip install -r requirements.txt
```

Запуск:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Админ-панель

```bash
cd admin
npm install
npm run dev
```

Откройте http://localhost:3000

### 3. Docker Compose (всё вместе)

```bash
cp backend/.env.example backend/.env
# Заполните backend/.env

docker-compose up --build
```

## Деплой на Railway

### Бэкенд (Python + Bot)

1. Создайте новый проект на [railway.app](https://railway.app)
2. Подключите GitHub-репозиторий, укажите `Root Directory: backend`
3. В Variables добавьте:
   ```
   TELEGRAM_TOKEN=ваш_токен_от_BotFather
   GEMINI_API_KEY=sk-XbaK7iXdvjUxcMjK7Y1qEBe2Ord1ew2N
   ADMIN_SECRET=ваш_секрет_для_админки
   ADMIN_FRONTEND_URL=https://ваш-домен-админки.netlify.app
   ```
4. Railway автоматически обнаружит Dockerfile и задеплоит

### Админ-панель (Next.js)

Вариант А — **Netlify** (рекомендуется):
1. Подключите репозиторий, укажите `Base directory: admin`
2. Build command: `npm run build`
3. Publish directory: `.next`
4. В переменных окружения укажите:
   ```
   NEXT_PUBLIC_API_URL=https://ваш-railway-домен.railway.app
   NEXT_PUBLIC_ADMIN_SECRET=ваш_секрет_для_админки
   ```

Вариант Б — **Render**:
1. New Web Service → GitHub repo → `Root Directory: admin`
2. Build: `npm install && npm run build`
3. Start: `npm start`

## Деплой на Render

### Бэкенд
1. New Web Service → Docker → `Root Directory: backend`
2. Environment Variables:
   ```
   TELEGRAM_TOKEN=...
   GEMINI_API_KEY=sk-XbaK7iXdvjUxcMjK7Y1qEBe2Ord1ew2N
   ADMIN_SECRET=...
   ```
3. Важно: добавьте Persistent Disk на `/app/uploads` и `/app/chroma_db` для сохранения данных

## Настройка бота

1. Создайте бота через [@BotFather](https://t.me/BotFather)
2. Получите `TELEGRAM_TOKEN`
3. Настройте команды бота в BotFather:
   ```
   start - Начать работу
   help - Помощь
   contacts - Контакты менеджеров
   clear - Очистить историю разговора
   ```

## Добавление базы знаний

1. Откройте админ-панель (http://localhost:3000 или ваш URL)
2. Создайте проект в разделе «Проекты (ЖК)»
3. В разделе «Документы» загрузите файлы:
   - PDF (текстовые и сканы — OCR автоматически через Gemini)
   - DOCX/DOC (Word-документы)
   - XLSX/XLS (Excel-таблицы)
   - TXT/MD (текстовые файлы)
4. Дождитесь статуса **«Проиндексирован»**

## Что умеет бот

- **Агентское вознаграждение (КВ/АВ)** — список процентов по всем ЖК
- **Ипотечные программы** — ссылка на актуальную таблицу
- **Рассрочка** — условия и параметры
- **Фиксация клиента** — ссылка на мини-апп
- **Сделки и документы** — переадресация в КЦ (305-05-05)
- **Характеристики ЖК** — структурированный ответ из базы знаний
- **Отделка квартир** — детальное описание вариантов
- **Возражения** — ссылка на документы по отработке возражений
- **Контакты менеджеров** — Яна Крылосова (ЕКБ), Алёна Дружинина (МСК)
- **Память разговора** — помнит контекст последних 6 обменов

## Переменные окружения (бэкенд)

| Переменная | Описание | По умолчанию |
|------------|----------|--------------|
| `TELEGRAM_TOKEN` | Токен бота от BotFather | Обязательно |
| `GEMINI_API_KEY` | API ключ ProxyAPI | `sk-XbaK7iXdvjUxcMjK7Y1qEBe2Ord1ew2N` |
| `GEMINI_BASE_URL` | URL ProxyAPI | `https://api.proxyapi.ru/google` |
| `GEMINI_MODEL` | Модель Gemini | `gemini-2.0-flash-exp` |
| `ADMIN_SECRET` | Секрет для Auth в API | `change-me-super-secret-key` |
| `ADMIN_FRONTEND_URL` | URL фронтенда для CORS | `http://localhost:3000` |
