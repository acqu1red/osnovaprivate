# 🚀 Настройка CATALYST CLUB Bot

## 📋 Шаг 1: Создание Telegram Bot

1. Откройте Telegram и найдите @BotFather
2. Отправьте команду `/newbot`
3. Введите имя бота: `CATALYST CLUB Bot`
4. Введите username: `catalyst_club_bot` (или любой другой)
5. Сохраните полученный токен

## 🔧 Шаг 2: Настройка переменных окружения

1. Создайте файл `.env` в корне проекта:
```bash
cp env_example.txt .env
```

2. Отредактируйте файл `.env`:
```env
BOT_TOKEN=ваш_токен_бота_здесь
PAYMENT_PROVIDER_TOKEN=токен_платежного_провайдера
MINI_APP_URL=https://your-mini-app-url.com
```

## 💳 Шаг 3: Настройка платежей (опционально)

### Вариант A: Telegram Payments
1. Обратитесь к @BotFather
2. Отправьте `/mybots`
3. Выберите вашего бота
4. Перейдите в "Payments"
5. Выберите платежного провайдера (например, Yandex.Money)
6. Получите токен и добавьте в `PAYMENT_PROVIDER_TOKEN`

### Вариант B: Собственная платежная система
1. Интегрируйте с вашим платежным провайдером
2. Обновите `payment_handler.py` для работы с вашей системой
3. Настройте webhook для обработки платежей

## 📱 Шаг 4: Настройка Mini App

1. Создайте Telegram Mini App через @BotFather
2. Разработайте веб-приложение для обратной связи
3. Добавьте URL в переменную `MINI_APP_URL`

### Пример простого Mini App:
```html
<!DOCTYPE html>
<html>
<head>
    <title>Обратная связь</title>
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
</head>
<body>
    <form id="feedback-form">
        <textarea placeholder="Ваш вопрос..."></textarea>
        <button type="submit">Отправить</button>
    </form>
    <script>
        const tg = window.Telegram.WebApp;
        tg.ready();
        
        document.getElementById('feedback-form').onsubmit = function(e) {
            e.preventDefault();
            const message = e.target.querySelector('textarea').value;
            tg.sendData(JSON.stringify({type: 'feedback', message: message}));
        };
    </script>
</body>
</html>
```

## 🚀 Шаг 5: Запуск бота

```bash
python bot.py
```

## 🔍 Шаг 6: Тестирование

1. Найдите вашего бота в Telegram
2. Отправьте команду `/start`
3. Проверьте все кнопки и функции
4. Протестируйте систему оплаты

## ⚙️ Дополнительные настройки

### Изменение цен
Отредактируйте `config.py`:
```python
SUBSCRIPTION_PRICES = {
    '1_month': 150000,  # 1500 рублей в копейках
    '6_months': 800000,  # 8000 рублей в копейках
    '12_months': 1000000  # 10000 рублей в копейках
}
```

### Изменение описания канала
Отредактируйте `CHANNEL_DESCRIPTION` в `config.py`

### Добавление новых кнопок
Отредактируйте `bot.py` в методе `start_command`

## 🔒 Безопасность

- Никогда не публикуйте токены в открытом доступе
- Используйте HTTPS для Mini App
- Регулярно обновляйте зависимости
- Настройте логирование для мониторинга

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи бота
2. Убедитесь, что все токены корректны
3. Проверьте подключение к интернету
4. Обратитесь к документации python-telegram-bot

## 🎯 Готово!

Ваш бот готов к использованию! Пользователи смогут:
- Просматривать информацию о канале
- Выбирать тарифные планы
- Оплачивать подписку
- Задавать вопросы через Mini App
