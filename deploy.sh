#!/bin/bash

# Скрипт для автоматической загрузки на GitHub
# OSNOVA Mini App Deployment

echo "🚀 Начинаем деплой OSNOVA Mini App..."

# Проверяем наличие git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен. Установите git для продолжения."
    exit 1
fi

# Инициализируем git репозиторий (если не существует)
if [ ! -d ".git" ]; then
    echo "📁 Инициализируем git репозиторий..."
    git init
    git remote add origin https://github.com/acqu1red/osnovaprivate.git
fi

# Добавляем все файлы
echo "📦 Добавляем файлы в git..."
git add .

# Создаем коммит
echo "💾 Создаем коммит..."
git commit -m "🚀 Deploy OSNOVA Mini App v1.0

✨ Новые возможности:
- Полнофункциональный чат с поддержкой файлов
- Админ-панель для ответов на вопросы
- Стильный дизайн в стиле digital black & gold
- Интеграция с Telegram каналом
- Автоматическое сохранение сообщений
- Поддержка вложений

🎨 Дизайн:
- The Matrix стиль
- Неоновые эффекты
- Адаптивная верстка
- Анимации и переходы

🔧 Технические улучшения:
- Чистый JavaScript без backend
- LocalStorage для данных
- Telegram Web App API
- Безопасная обработка данных"

# Отправляем на GitHub
echo "🌐 Отправляем на GitHub..."
git push -u origin main

echo "✅ Деплой завершен!"
echo "📱 Mini App доступен по адресу: https://acqu1red.github.io/osnovaprivate/"
echo "🔗 Добавьте этот URL в настройки бота как MINI_APP_URL"
