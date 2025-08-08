import logging
import json
import asyncio
from datetime import datetime, timedelta
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo, InputMediaPhoto
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes, MessageHandler, filters
from urllib.parse import quote
from config import (
    BOT_TOKEN, SUBSCRIPTION_PRICES, CHANNEL_NAME, CHANNEL_DESCRIPTION, 
    MINI_APP_URL, START_MESSAGE, REMINDER_24H_MESSAGE
)
from payment_handler import PaymentHandler

# Настройка логрования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class CatalystBot:
    def __init__(self):
        self.application = Application.builder().token(BOT_TOKEN).build()
        self.payment_handler = PaymentHandler()
        self.unpaid_users = {}  # Словарь для отслеживания неоплаченных пользователей
        # Администраторы, которым отправляются уведомления о новых вопросах
        self.admin_ids = [8354723250, 7365307696]
        self.setup_handlers()
    
    def setup_handlers(self):
        """Настройка обработчиков команд"""
        self.application.add_handler(CommandHandler("start", self.start_command))
        self.application.add_handler(CallbackQueryHandler(self.button_callback))
        # Данные из Mini App (WebApp) приходят в виде web_app_data в сообщении
        self.application.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, self.handle_web_app_data))
        
        # Добавляем обработчик ошибок
        self.application.add_error_handler(self.error_handler)
    
    async def error_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик ошибок"""
        logger.error(f"Exception while handling an update: {context.error}")
        
        # Логируем детали ошибки
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        # Если это ошибка с callback query, просто логируем её
        if "Query is too old" in str(context.error) or "query id is invalid" in str(context.error):
            logger.warning("Callback query expired or invalid - ignoring")
            return
        
        # Для других ошибок можно отправить сообщение пользователю
        if update and update.effective_message:
            try:
                await update.effective_message.reply_text(
                    "Произошла ошибка при обработке вашего запроса. Попробуйте еще раз."
                )
            except Exception as e:
                logger.error(f"Could not send error message to user: {e}")
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        user = update.effective_user
        user_mention = f"[{user.first_name}](tg://user?id={user.id})" if user.first_name else f"[Пользователь](tg://user?id={user.id})"
        
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
        
        # Используем новое стартовое сообщение из конфига
        welcome_text = START_MESSAGE.format(user_mention=user_mention)
        
        # Записываем пользователя как неоплаченного
        self.unpaid_users[user.id] = {
            'start_time': datetime.now(),
            'reminder_24h_sent': False,
            'reminder_35h_sent': False
        }
        
        # Запускаем задачи для напоминаний
        asyncio.create_task(self.schedule_reminders(user.id, context))
        
        # Отправляем сообщение с картинкой
        try:
            with open('start.png', 'rb') as photo:
                await update.message.reply_photo(
                    photo=photo,
                    caption=welcome_text,
                    reply_markup=reply_markup,
                    parse_mode='Markdown'
                )
        except FileNotFoundError:
            # Если картинка не найдена, отправляем только текст
            await update.message.reply_text(welcome_text, reply_markup=reply_markup, parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Error sending start message with image: {e}")
            # Fallback к текстовому сообщению
            await update.message.reply_text(welcome_text, reply_markup=reply_markup, parse_mode='Markdown')
    
    async def schedule_reminders(self, user_id: int, context: ContextTypes.DEFAULT_TYPE):
        """Планирование напоминаний для пользователя"""
        try:
            # Напоминание через 24 часа
            await asyncio.sleep(24 * 3600)  # 24 часа
            if user_id in self.unpaid_users and not self.unpaid_users[user_id]['reminder_24h_sent']:
                await self.send_24h_reminder(user_id, context)
                self.unpaid_users[user_id]['reminder_24h_sent'] = True
            
            # Напоминание через 35 часов с видео
            await asyncio.sleep(11 * 3600)  # Еще 11 часов (всего 35)
            if user_id in self.unpaid_users and not self.unpaid_users[user_id]['reminder_35h_sent']:
                await self.send_35h_reminder(user_id, context)
                self.unpaid_users[user_id]['reminder_35h_sent'] = True
                
        except Exception as e:
            logger.error(f"Error in reminder scheduling for user {user_id}: {e}")
    
    async def send_24h_reminder(self, user_id: int, context: ContextTypes.DEFAULT_TYPE):
        """Отправка напоминания через 24 часа"""
        try:
            keyboard = [
                [
                    InlineKeyboardButton("💳 Оплатить доступ", callback_data="payment_menu")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Отправляем сообщение с картинкой
            with open('prgrev1.png', 'rb') as photo:
                await context.bot.send_photo(
                    chat_id=user_id,
                    photo=photo,
                    caption=REMINDER_24H_MESSAGE,
                    reply_markup=reply_markup,
                    parse_mode='Markdown'
                )
                
        except Exception as e:
            logger.error(f"Error sending 24h reminder to user {user_id}: {e}")
    
    async def send_35h_reminder(self, user_id: int, context: ContextTypes.DEFAULT_TYPE):
        """Отправка напоминания через 35 часов с видео в формате кружочка"""
        try:
            keyboard = [
                [
                    InlineKeyboardButton("💳 Оплатить доступ", callback_data="payment_menu")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Отправляем видео в формате кружочка (как видео-сообщение)
            with open('progred2.mp4', 'rb') as video:
                await context.bot.send_video_note(
                    chat_id=user_id,
                    video_note=video,
                    reply_markup=reply_markup
                )
                
        except Exception as e:
            logger.error(f"Error sending 35h reminder to user {user_id}: {e}")
    
    async def button_callback(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик нажатий на инлайн-кнопки"""
        query = update.callback_query
        
        # Безопасно отвечаем на callback query
        try:
            await query.answer()
        except Exception as e:
            logger.warning(f"Could not answer callback query: {e}")
            # Продолжаем выполнение даже если не удалось ответить на callback
        
        try:
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
        except Exception as e:
            logger.error(f"Error in button_callback for data '{query.data}': {e}")
            # Пытаемся отправить сообщение об ошибке пользователю
            try:
                await query.message.reply_text("Произошла ошибка при обработке запроса. Попробуйте еще раз.")
            except Exception as reply_error:
                logger.error(f"Could not send error reply: {reply_error}")
    
    async def show_payment_menu(self, query):
        """Показать меню оплаты"""
        try:
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
💵 **Стоимость подписки на ФОРМУЛА**

📅 **1 месяц**: 1500 рублей
📅 **6 месяцев**: 8000 рублей  
📅 **12 месяцев**: 10000 рублей

💱 *Цена в долларах/евро конвертируется по текущему курсу*
💳 *Оплачивайте любой картой в долларах/евро/рублях*

Выберите удобный тариф ⬇️
            """
            
            # Проверяем, есть ли фото в сообщении
            if query.message.photo:
                # Если есть фото, редактируем медиа
                try:
                    with open('start.png', 'rb') as photo:
                        await query.edit_message_media(
                            media=InputMediaPhoto(
                                media=photo,
                                caption=payment_text,
                                parse_mode='Markdown'
                            ),
                            reply_markup=reply_markup
                        )
                except FileNotFoundError:
                    # Если файл изображения не найден, редактируем только текст
                    await query.edit_message_text(payment_text, reply_markup=reply_markup, parse_mode='Markdown')
            else:
                # Если нет фото, редактируем текст
                await query.edit_message_text(payment_text, reply_markup=reply_markup, parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Error in show_payment_menu: {e}")
            # Пытаемся отправить новое сообщение если редактирование не удалось
            try:
                await query.message.reply_text("Произошла ошибка. Попробуйте еще раз.")
            except Exception as reply_error:
                logger.error(f"Could not send error reply: {reply_error}")
    
    async def show_payment_options(self, query):
        """Показать варианты оплаты для выбранного тарифа"""
        try:
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
            
            # Проверяем, есть ли фото в сообщении
            if query.message.photo:
                # Если есть фото, редактируем медиа
                try:
                    with open('start.png', 'rb') as photo:
                        await query.edit_message_media(
                            media=InputMediaPhoto(
                                media=photo,
                                caption=payment_options_text,
                                parse_mode='Markdown'
                            ),
                            reply_markup=reply_markup
                        )
                except FileNotFoundError:
                    # Если файл изображения не найден, редактируем только текст
                    await query.edit_message_text(payment_options_text, reply_markup=reply_markup, parse_mode='Markdown')
            else:
                # Если нет фото, редактируем текст
                await query.edit_message_text(payment_options_text, reply_markup=reply_markup, parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Error in show_payment_options: {e}")
            try:
                await query.message.reply_text("Произошла ошибка. Попробуйте еще раз.")
            except Exception as reply_error:
                logger.error(f"Could not send error reply: {reply_error}")
    
    async def show_channel_info(self, query):
        """Показать информацию о канале"""
        try:
            keyboard = [
                [
                    InlineKeyboardButton("💳 Оплатить доступ", callback_data="payment_menu")
                ],
                [
                    InlineKeyboardButton("❓ Задать вопрос", web_app=WebAppInfo(url=MINI_APP_URL))
                ],
                [
                    InlineKeyboardButton("⬅️ Назад", callback_data="back_to_main")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            # Проверяем, есть ли фото в сообщении
            if query.message.photo:
                # Если есть фото, редактируем медиа
                try:
                    with open('start.png', 'rb') as photo:
                        await query.edit_message_media(
                            media=InputMediaPhoto(
                                media=photo,
                                caption=CHANNEL_DESCRIPTION,
                                parse_mode='Markdown'
                            ),
                            reply_markup=reply_markup
                        )
                except FileNotFoundError:
                    # Если файл изображения не найден, редактируем только текст
                    await query.edit_message_text(CHANNEL_DESCRIPTION, reply_markup=reply_markup, parse_mode='Markdown')
            else:
                # Если нет фото, редактируем текст
                await query.edit_message_text(CHANNEL_DESCRIPTION, reply_markup=reply_markup, parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Error in show_channel_info: {e}")
            try:
                await query.message.reply_text("Произошла ошибка. Попробуйте еще раз.")
            except Exception as reply_error:
                logger.error(f"Could not send error reply: {reply_error}")
    
    async def back_to_main_menu(self, query):
        """Вернуться в главное меню"""
        try:
            user = query.from_user
            user_mention = f"[{user.first_name}](tg://user?id={user.id})" if user.first_name else f"[Пользователь](tg://user?id={user.id})"
            
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
            
            # Используем новое стартовое сообщение из конфига
            welcome_text = START_MESSAGE.format(user_mention=user_mention)
            
            # Отправляем сообщение с картинкой
            try:
                with open('start.png', 'rb') as photo:
                    await query.edit_message_media(
                        media=InputMediaPhoto(
                            media=photo,
                            caption=welcome_text,
                            parse_mode='Markdown'
                        ),
                        reply_markup=reply_markup
                    )
            except FileNotFoundError:
                # Если картинка не найдена, отправляем только текст
                await query.edit_message_text(welcome_text, reply_markup=reply_markup, parse_mode='Markdown')
            except Exception as e:
                logger.error(f"Error sending back to main menu with image: {e}")
                # Fallback к текстовому сообщению
                await query.edit_message_text(welcome_text, reply_markup=reply_markup, parse_mode='Markdown')
        except Exception as e:
            logger.error(f"Error in back_to_main_menu: {e}")
            try:
                await query.message.reply_text("Произошла ошибка. Попробуйте еще раз.")
            except Exception as reply_error:
                logger.error(f"Could not send error reply: {reply_error}")
    
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
                    # Отправляем уведомления администраторам
                    await self.send_admin_notifications(context, data['data'])
                    
                elif data.get('type') == 'admin_reply':
                    # Отправляем ответ пользователю
                    await self.send_reply_to_user(context, data['data'])
                    
        except Exception as e:
            logger.error(f"Error handling web app data: {e}")
    
    async def send_question_to_channel(self, context: ContextTypes.DEFAULT_TYPE, data):
        """Отправка вопроса в канал"""
        try:
            channel_id = -1002686841761
            
            # Форматируем сообщение для канала
            user_info = data['user']
            username = user_info.get('username', 'скрыт')
            first_name = user_info.get('first_name', 'Пользователь')
            
            message_text = f"""
🔔 **Новый запрос от пользователя**

👤 **Имя**: {first_name}
📝 **Username**: @{username}
🆔 **ID**: {user_info.get('id', 'неизвестен')}

💬 **Сообщение**:
{data.get('question', 'Текст не указан')}

⏰ **Время**: {data.get('timestamp', 'не указано')}

💡 **Нажмите "Ответить" для быстрого ответа через Mini App**
            """
            
            # Кнопка для ответа через Mini App с параметрами
            query_params = (
                f"userId={quote(str(user_info.get('id')))}"
                f"&messageId={quote(str(data.get('message_id')))}"
                f"&first_name={quote(first_name)}"
                f"&username={quote(username)}"
                f"&question={quote(data.get('question', ''))}"
            )
            reply_url = f"{MINI_APP_URL}?{query_params}"
            keyboard = [[InlineKeyboardButton("💬 Ответить", web_app=WebAppInfo(url=reply_url))]]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await context.bot.send_message(
                chat_id=channel_id,
                text=message_text,
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Error sending to channel: {e}")

    async def send_admin_notifications(self, context: ContextTypes.DEFAULT_TYPE, data):
        """Отправляем уведомления администраторам о новом вопросе"""
        try:
            user_info = data['user']
            username = user_info.get('username', 'скрыт')
            first_name = user_info.get('first_name', 'Пользователь')

            message_text = (
                "🔔 Новый вопрос от пользователя\n\n"
                f"👤 Имя: {first_name}\n"
                f"📝 Username: @{username}\n"
                f"🆔 ID: {user_info.get('id', 'неизвестен')}\n\n"
                "💬 Сообщение:\n"
                f"{data.get('question', 'Текст не указан')}\n\n"
                "💡 Нажмите 'Ответить', чтобы открыть панель и ответить пользователю"
            )

            # Передаем данные в Mini App через query-параметры
            query_params = (
                f"userId={quote(str(user_info.get('id')))}"
                f"&messageId={quote(str(data.get('message_id')))}"
                f"&first_name={quote(first_name)}"
                f"&username={quote(username)}"
                f"&question={quote(data.get('question', ''))}"
            )
            reply_url = f"{MINI_APP_URL}?{query_params}"

            keyboard = [[InlineKeyboardButton("💬 Ответить", web_app=WebAppInfo(url=reply_url))]]
            reply_markup = InlineKeyboardMarkup(keyboard)

            for admin_id in self.admin_ids:
                try:
                    await context.bot.send_message(
                        chat_id=admin_id,
                        text=message_text,
                        reply_markup=reply_markup,
                        parse_mode='Markdown'
                    )
                except Exception as send_err:
                    logger.error(f"Error notifying admin {admin_id}: {send_err}")
        except Exception as e:
            logger.error(f"Error in send_admin_notifications: {e}")
    
    async def send_reply_to_user(self, context: ContextTypes.DEFAULT_TYPE, data):
        """Отправка ответа пользователю"""
        try:
            user_id = data['userId']
            message = data['message']
            admin_name = data.get('adminName', 'Администратор')
            admin_id = data.get('adminId')
            # Добавляем галочку для известных администраторов
            display_admin_name = (
                f"{admin_name} ✓" if admin_id in self.admin_ids else admin_name
            )
            
            keyboard = [
                [
                    InlineKeyboardButton("💬 Открыть чат", web_app=WebAppInfo(url=MINI_APP_URL))
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await context.bot.send_message(
                chat_id=user_id,
                text=f"💬 **Ответ от {display_admin_name}:**\n\n{message}",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
        except Exception as e:
            logger.error(f"Error sending reply to user: {e}")
    
    def run(self):
        """Запуск бота"""
        try:
            # Запускаем бота напрямую - webhook будет очищен автоматически
            self.application.run_polling(allowed_updates=Update.ALL_TYPES)
        except Exception as e:
            logger.error(f"Error starting bot: {e}")
            print(f"❌ Ошибка запуска бота: {e}")
            print("💡 Попробуйте остановить другие процессы бота и запустить заново")

if __name__ == "__main__":
    bot = CatalystBot()
    bot.run()
