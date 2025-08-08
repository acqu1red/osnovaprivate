# ⚡ Быстрый запуск CATALYST CLUB Bot

## 🚀 За 5 минут к работающему боту

### 1. Получите токен бота
- Найдите @BotFather в Telegram
- Отправьте `/newbot`
- Введите имя: `CATALYST CLUB Bot`
- Введите username: `catalyst_club_bot`
- Сохраните токен

### 2. Настройте переменные
```bash
cp env_example.txt .env
```

Отредактируйте `.env`:
```env
BOT_TOKEN=ваш_токен_здесь
PAYMENT_PROVIDER_TOKEN=test_token
MINI_APP_URL=https://your-mini-app-url.com
```

### 3. Запустите бота
```bash
python bot.py
```

### 4. Протестируйте
- Найдите бота в Telegram
- Отправьте `/start`
- Проверьте все кнопки

## ✅ Готово!

Ваш бот работает! Теперь можно:
- Настроить платежи (см. SETUP.md)
- Создать Mini App (см. mini_app_example.html)
- Кастомизировать под свои нужды

## 📞 Нужна помощь?

См. подробные инструкции в `SETUP.md` и `README.md`
