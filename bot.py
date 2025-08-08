import os
import json
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from config import BOT_TOKEN, ADMIN_IDS

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class OSNOVABot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.setup_handlers()
        
    def setup_handlers(self):
        """Настройка обработчиков команд и сообщений"""
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        self.application.add_handler(CallbackQueryHandler(self.handle_callback))
        
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка команды /start"""
        user = update.effective_user
        welcome_text = f"""
👋 Добро пожаловать в ОСНОВА!

Я бот для доступа к закрытому каналу с техникой OSNOVA.

🔗 Для использования откройте Mini App:
https://acqu1red.github.io/osnovaprivate/

📝 Задайте любой вопрос, и администраторы ответят вам в ближайшее время.
        """
        
        await update.message.reply_text(welcome_text)
        
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка обычных сообщений"""
        user = update.effective_user
        message_text = update.message.text
        
        # Если сообщение от админа и содержит ответ пользователю
        if user.id in ADMIN_IDS and message_text.startswith("Ответить"):
            await self.handle_admin_reply(update, context)
        else:
            # Обычное сообщение - отправляем в Mini App
            await self.redirect_to_mini_app(update, context)
    
    async def handle_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка callback запросов от inline кнопок"""
        query = update.callback_query
        await query.answer()
        
        if query.data == "reply_to_user":
            # Открываем Mini App с панелью администратора
            mini_app_url = "https://acqu1red.github.io/osnovaprivate/?admin=true"
            await query.edit_message_reply_markup(
                InlineKeyboardMarkup([[
                    InlineKeyboardButton("Открыть панель администратора", url=mini_app_url)
                ]])
            )
    
    async def handle_admin_reply(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка ответа администратора"""
        user = update.effective_user
        message_text = update.message.text
        
        try:
            # Парсим ответ администратора
            # Формат: "Ответить [user_id]: [message]"
            if ":" in message_text:
                parts = message_text.split(":", 1)
                user_id_part = parts[0].replace("Ответить", "").strip()
                reply_text = parts[1].strip()
                
                try:
                    target_user_id = int(user_id_part)
                    
                    # Отправляем ответ пользователю
                    await context.bot.send_message(
                        chat_id=target_user_id,
                        text=f"💬 Ответ от администратора:\n\n{reply_text}"
                    )
                    
                    await update.message.reply_text("✅ Ответ отправлен пользователю!")
                    
                except ValueError:
                    await update.message.reply_text("❌ Неверный формат. Используйте: Ответить [ID]: [сообщение]")
            else:
                await update.message.reply_text("❌ Неверный формат. Используйте: Ответить [ID]: [сообщение]")
                
        except Exception as e:
            logger.error(f"Error handling admin reply: {e}")
            await update.message.reply_text("❌ Ошибка при отправке ответа")
    
    async def redirect_to_mini_app(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Перенаправление в Mini App"""
        mini_app_url = "https://acqu1red.github.io/osnovaprivate/"
        
        keyboard = [[InlineKeyboardButton("Открыть чат", url=mini_app_url)]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(
            "🔗 Для отправки сообщения откройте Mini App:",
            reply_markup=reply_markup
        )
    
    async def handle_webapp_data(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработка данных от Web App"""
        try:
            # Получаем данные от Web App
            web_app_data = update.message.web_app_data.data
            data = json.loads(web_app_data)
            
            if data.get("type") == "new_question":
                await self.handle_new_question(update, context, data["data"])
            elif data.get("type") == "admin_reply":
                await self.handle_admin_reply_data(update, context, data["data"])
                
        except Exception as e:
            logger.error(f"Error handling webapp data: {e}")
    
    async def handle_new_question(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data):
        """Обработка нового вопроса от пользователя"""
        user_id = data["user"]["id"]
        username = data["user"]["username"] or "скрыт"
        question = data["question"]
        
        # Формируем сообщение для админов
        admin_message = f"""
❓ Новый запрос от пользователя

👤 Пользователь: @{username}
🆔 ID: {user_id}
💬 Сообщение: {question}

Нажмите кнопку ниже для ответа:
        """
        
        # Создаем inline кнопку для ответа
        keyboard = [[
            InlineKeyboardButton("Ответить", callback_data="reply_to_user")
        ]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        # Отправляем уведомление всем админам
        for admin_id in ADMIN_IDS:
            try:
                await context.bot.send_message(
                    chat_id=admin_id,
                    text=admin_message,
                    reply_markup=reply_markup
                )
            except Exception as e:
                logger.error(f"Error sending notification to admin {admin_id}: {e}")
    
    async def handle_admin_reply_data(self, update: Update, context: ContextTypes.DEFAULT_TYPE, data):
        """Обработка ответа администратора через Web App"""
        user_id = data["userId"]
        message = data["message"]
        admin_id = data["adminId"]
        
        try:
            # Отправляем ответ пользователю
            await context.bot.send_message(
                chat_id=user_id,
                text=f"💬 Ответ от администратора:\n\n{message}"
            )
            
            # Подтверждаем админу
            await context.bot.send_message(
                chat_id=admin_id,
                text="✅ Ответ успешно отправлен пользователю!"
            )
            
        except Exception as e:
            logger.error(f"Error sending admin reply: {e}")
            await context.bot.send_message(
                chat_id=admin_id,
                text="❌ Ошибка при отправке ответа пользователю"
            )
    
    def run(self):
        """Запуск бота"""
        logger.info("Starting OSNOVA Bot...")
        self.application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    bot = OSNOVABot()
    bot.run()
