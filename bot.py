import logging
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from config import BOT_TOKEN, SUBSCRIPTION_PRICES, CHANNEL_NAME, CHANNEL_DESCRIPTION, MINI_APP_URL
from payment_handler import PaymentHandler

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class CatalystBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.payment_handler = PaymentHandler()
        self.setup_handlers()
    
    def setup_handlers(self):
        """Настройка обработчиков команд"""
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        keyboard = [
            [
                InlineKeyboardButton("💳 Оплатить доступ", callback_data="payment_menu"),
                InlineKeyboardButton("📋 Подробнее о канале", callback_data="channel_info")
            ],
            [
                InlineKeyboardButton("❓ Задать вопрос", web_app=WebAppInfo(url=MINI_APP_URL))
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        welcome_text = f"""
🌟 Добро пожаловать в официальный бот канала CATALYST CLUB!

🔐 Здесь вы можете узнать больше о закрытом канале "{CHANNEL_NAME}" и получить к нему доступ.

💎 **Подписка**: ежемесячная 1500₽ или ~14$
💳 Оплата принимается в любой валюте, криптовалюте, звездах

Выберите действие ниже ⬇️
        """
        
        await update.message.reply_text(welcome_text, reply_markup=reply_markup)
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик нажатий на инлайн-кнопки"""
        query = update.callback_query
        await query.answer()
        
        if query.data == "payment_menu":
            await self.show_payment_menu(query)
        elif query.data == "channel_info":
            await self.show_channel_info(query)
        elif query.data == "back_to_main":
            await self.back_to_main_menu(query)
        elif query.data in ["1_month", "6_months", "12_months"]:
            await self.show_payment_options(query)
        elif query.data == "back_to_payment":
            await self.show_payment_menu(query)
        elif query.data == "card_payment":
            await self.payment_handler.process_card_payment(update, context, "1_month")
        elif query.data == "terms":
            await self.payment_handler.show_terms(update, context)
        elif query.data == "web_app_data":
            await self.handle_web_app_data(update, context)
    
    async def show_payment_menu(self, query):
        """Показать меню оплаты"""
        keyboard = [
            [
                InlineKeyboardButton("1️⃣ 1 месяц - 1500₽", callback_data="1_month"),
                InlineKeyboardButton("6️⃣ 6 месяцев - 8000₽", callback_data="6_months")
            ],
            [
                InlineKeyboardButton("1️⃣2️⃣ 12 месяцев - 10000₽", callback_data="12_months")
            ],
            [
                InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        payment_text = """
💵 **Стоимость подписки на Базу**

📅 **1 месяц**: 1500 рублей
📅 **6 месяцев**: 8000 рублей  
📅 **12 месяцев**: 10000 рублей

💱 *Цена в долларах/евро конвертируется по текущему курсу*
💳 *Оплачивайте любой картой в долларах/евро/рублях*

Выберите удобный тариф ⬇️
        """
        
        await query.edit_message_text(payment_text, reply_markup=reply_markup)
    
    async def show_payment_options(self, query):
        """Показать варианты оплаты для выбранного тарифа"""
        duration_map = {
            "1_month": "1 месяц",
            "6_months": "6 месяцев", 
            "12_months": "12 месяцев"
        }
        
        duration = duration_map.get(query.data, "1 месяц")
        
        keyboard = [
            [
                InlineKeyboardButton("💳 Карта (любая валюта)", callback_data="card_payment")
            ],
            [
                InlineKeyboardButton("❓ Задать вопрос", web_app=WebAppInfo(url=MINI_APP_URL))
            ],
            [
                InlineKeyboardButton("📄 Договор оферты", callback_data="terms")
            ],
            [
                InlineKeyboardButton("⬅️ Назад", callback_data="back_to_payment")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        payment_options_text = f"""
🦍 **ЗАКРЫТЫЙ КАНАЛ "{CHANNEL_NAME}" на {duration}**

Выберите удобный вид оплаты:

⚠️ *Если вы из Украины, включите VPN*
💳 *При оплате картой оформляется автосписание каждые 30 дней*
⚙️ *Далее вы сможете управлять подпиской в Меню бота*
🪙 *Оплата криптой доступна на тарифах 6/12 мес*
        """
        
        await query.edit_message_text(payment_options_text, reply_markup=reply_markup)
    
    async def show_channel_info(self, query):
        """Показать информацию о канале"""
        keyboard = [
            [
                InlineKeyboardButton("❓ Задать вопрос", web_app=WebAppInfo(url=MINI_APP_URL))
            ],
            [
                InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(CHANNEL_DESCRIPTION, reply_markup=reply_markup)
    
    async def back_to_main_menu(self, query):
        """Вернуться в главное меню"""
        keyboard = [
            [
                InlineKeyboardButton("💳 Оплатить доступ", callback_data="payment_menu"),
                InlineKeyboardButton("📋 Подробнее о канале", callback_data="channel_info")
            ],
            [
                InlineKeyboardButton("❓ Задать вопрос", web_app=WebAppInfo(url=MINI_APP_URL))
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        welcome_text = f"""
🌟 Добро пожаловать в официальный бот канала CATALYST CLUB!

🔐 Здесь вы можете узнать больше о закрытом канале "{CHANNEL_NAME}" и получить к нему доступ.

💎 **Подписка**: ежемесячная 1500₽ или ~14$
💳 Оплата принимается в любой валюте, криптовалюте, звездах

Выберите действие ниже ⬇️
        """
        
        await query.edit_message_text(welcome_text, reply_markup=reply_markup)
    
    async def handle_web_app_data(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка данных от Mini App"""
        try:
            # Получаем данные от Mini App
            web_app_data = update.effective_message.web_app_data
            if web_app_data:
                data = json.loads(web_app_data.data)
                
                if data.get('type') == 'new_question':
                    # Отправляем вопрос в канал
                    await self.send_question_to_channel(context, data['data'])
                    
                elif data.get('type') == 'admin_reply':
                    # Отправляем ответ пользователю
                    await self.send_reply_to_user(context, data['data'])
                    
        except Exception as e:
            logger.error(f"Error handling web app data: {e}")
    
    async def send_question_to_channel(self, context: ContextTypes.DEFAULT_TYPE, data):
        """Отправка вопроса в канал"""
        try:
            channel_id = -1002686841761
            message_text = data['message']
            
            await context.bot.send_message(
                chat_id=channel_id,
                text=message_text,
                parse_mode='HTML'
            )
            
        except Exception as e:
            logger.error(f"Error sending to channel: {e}")
    
    async def send_reply_to_user(self, context: ContextTypes.DEFAULT_TYPE, data):
        """Отправка ответа пользователю"""
        try:
            user_id = data['userId']
            message = data['message']
            
            keyboard = [
                [
                    InlineKeyboardButton("💬 Открыть чат", web_app=WebAppInfo(url=MINI_APP_URL))
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await context.bot.send_message(
                chat_id=user_id,
                text=f"📩 Ответ на ваш вопрос:\n\n{message}",
                reply_markup=reply_markup
            )
            
        except Exception as e:
            logger.error(f"Error sending reply to user: {e}")
    
    def run(self):
        """Запуск бота"""
        self.application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    bot = CatalystBot()
    bot.run()
