#!/bin/bash

echo "🤖 Запуск CATALYST CLUB Bot..."

# Проверяем, не запущен ли уже бот
if pgrep -f "python bot.py" > /dev/null; then
    echo "⚠️  Бот уже запущен. Останавливаем предыдущий процесс..."
    pkill -f "python bot.py"
    sleep 2
fi

# Проверяем наличие .env файла
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден!"
    echo "💡 Создайте файл .env с токеном бота"
    exit 1
fi

# Проверяем токен
if ! grep -q "BOT_TOKEN=" .env; then
    echo "❌ BOT_TOKEN не найден в .env файле!"
    exit 1
fi

echo "✅ Все проверки пройдены. Запускаем бота..."

# Активируем виртуальное окружение и запускаем бота
source .venv/bin/activate
python bot.py
