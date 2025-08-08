import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Токен бота
BOT_TOKEN = os.getenv('BOT_TOKEN')

# ID администраторов
ADMIN_IDS = [708907063, 7365307696]

# Проверка наличия токена
if not BOT_TOKEN:
    raise ValueError("BOT_TOKEN не найден в переменных окружения!")
