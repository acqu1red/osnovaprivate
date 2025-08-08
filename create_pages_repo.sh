#!/bin/bash

echo "🚀 Создание отдельного репозитория для GitHub Pages..."

# Создаем папку для сайта
mkdir -p osnovaprivate-pages
cd osnovaprivate-pages

# Копируем только файлы для сайта
cp ../index.html .
cp -r ../assets .
cp -r ../scripts .

# Инициализируем git
git init
git add .

# Создаем коммит
git commit -m "🚀 Deploy OSNOVA Mini App to GitHub Pages

✨ Features:
- Стильный дизайн в стиле digital black & gold
- Полнофункциональный чат с поддержкой файлов
- Админ-панель для ответов на вопросы
- Адаптивная верстка для всех устройств

🎨 Design:
- The Matrix стиль
- Неоновые эффекты
- Анимации и переходы

🔧 Technical:
- Чистый JavaScript без backend
- LocalStorage для данных
- Telegram Web App API"

echo "✅ Файлы скопированы в osnovaprivate-pages/"
echo ""
echo "📋 Следующие шаги:"
echo "1. Создайте новый репозиторий на GitHub: osnovaprivate-pages"
echo "2. Выполните команды:"
echo "   cd osnovaprivate-pages"
echo "   git remote add origin https://github.com/acqu1red/osnovaprivate-pages.git"
echo "   git push -u origin main"
echo "3. Активируйте GitHub Pages в настройках нового репозитория"
echo "4. Обновите URL в боте на: https://acqu1red.github.io/osnovaprivate-pages/"
