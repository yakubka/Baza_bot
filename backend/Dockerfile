FROM python:3.11-slim

# Системные зависимости
RUN apt-get update && apt-get install -y \
    libmupdf-dev \
    mupdf \
    mupdf-tools \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python зависимости
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Код приложения
COPY . .

# Директории для данных
RUN mkdir -p uploads chroma_db

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
