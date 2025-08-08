#!/bin/bash

echo "🚀 Запуск ОСНОВА Mini App..."

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

# Запускаем в режиме разработки
echo "🎯 Запуск в режиме разработки..."
npm start
