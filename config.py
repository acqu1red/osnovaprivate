import os
from dotenv import load_dotenv

load_dotenv()

# Telegram Bot Token
BOT_TOKEN = os.getenv('BOT_TOKEN')

# Payment settings
PAYMENT_PROVIDER_TOKEN = os.getenv('PAYMENT_PROVIDER_TOKEN')

# Subscription prices (in kopecks for Telegram payments)
SUBSCRIPTION_PRICES = {
    '1_month': 150000,  # 1500 rubles in kopecks
    '6_months': 800000,  # 8000 rubles in kopecks
    '12_months': 1000000  # 10000 rubles in kopecks
}

# Mini App settings
MINI_APP_URL = os.getenv('MINI_APP_URL', 'https://acqu1red.github.io/osnovaprivate/')

# Channel information
CHANNEL_NAME = "ОСНОВА"
CHANNEL_DESCRIPTION = """
🔐 ЗАКРЫТЫЙ КАНАЛ "ОСНОВА"

📚 Что вы получите:
• Психология прикладная (психотипы)
• Виды заработка и стратегии
• Акции на биржах и анализ
• Профайлинг и поведенческая аналитика
• Эксклюзивные торговые стратегии
• Доступ к закрытому сообществу

💎 Присоединяйтесь к элите трейдеров и психологов!
"""
