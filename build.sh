#!/bin/bash

echo "🏗️ Сборка ОСНОВА Mini App для продакшена..."

# Проверяем наличие Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js не найден. Установите Node.js 18+"
    exit 1
fi

# Проверяем версию Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Требуется Node.js 18+. Текущая версия: $(node -v)"
    exit 1
fi

echo "✅ Node.js версия: $(node -v)"

# Устанавливаем зависимости
echo "📦 Установка зависимостей..."
npm install

# Собираем проект
echo "🔨 Сборка проекта..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Сборка завершена успешно!"
    echo "📁 Файлы готовы в папке build/"
    echo "🚀 Для деплоя на GitHub Pages:"
    echo "   1. Скопируйте содержимое папки build/ в корень репозитория"
    echo "   2. Настройте GitHub Pages в настройках репозитория"
    echo "   3. Выберите источник: Deploy from a branch"
    echo "   4. Выберите ветку: main"
    echo "   5. Выберите папку: / (root)"
else
    echo "❌ Ошибка при сборке проекта"
    exit 1
fi
