import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ContextTypes
from config import PAYMENT_PROVIDER_TOKEN, SUBSCRIPTION_PRICES, MINI_APP_URL

logger = logging.getLogger(__name__)

class PaymentHandler:
    def __init__(self):
        self.payment_provider_token = PAYMENT_PROVIDER_TOKEN
    
    async def process_card_payment(self, update: Update, context: ContextTypes.DEFAULT_TYPE, subscription_type: str):
        """Обработка платежа картой"""
        query = update.callback_query
        await query.answer()
        
        # Получаем цену в копейках
        price = SUBSCRIPTION_PRICES.get(subscription_type, 150000)
        
        # Создаем инвойс для оплаты
        try:
            # Здесь будет интеграция с платежной системой
            # Пока что просто показываем сообщение об успешной оплате
            success_text = f"""
✅ **Оплата прошла успешно!**

🎉 Добро пожаловать в закрытый канал "{subscription_type.replace('_', ' ').title()}"

📱 Вы получите приглашение в канал в ближайшее время.
📧 Проверьте также email для дополнительной информации.

Спасибо за доверие! 🙏
            """
            
            keyboard = [
                [
                    InlineKeyboardButton("🏠 Главное меню", callback_data="back_to_main")
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(success_text, reply_markup=reply_markup)
            
        except Exception as e:
            logger.error(f"Payment error: {e}")
            error_text = """
❌ **Ошибка при обработке платежа**

Пожалуйста, попробуйте еще раз или обратитесь в поддержку.
            """
            
            keyboard = [
                [
                    InlineKeyboardButton("🔄 Попробовать снова", callback_data="payment_menu")
                ],
                [
                    InlineKeyboardButton("❓ Задать вопрос", web_app=WebAppInfo(url=MINI_APP_URL))
                ]
            ]
            reply_markup = InlineKeyboardMarkup(keyboard)
            
            await query.edit_message_text(error_text, reply_markup=reply_markup)
    
    async def show_crypto_payment(self, update: Update, context: ContextTypes.DEFAULT_TYPE, subscription_type: str):
        """Показать информацию для оплаты криптовалютой"""
        query = update.callback_query
        await query.answer()
        
        crypto_text = f"""
🪙 **Оплата криптовалютой**

Для оплаты подписки "{subscription_type.replace('_', ' ').title()}" используйте:

**Bitcoin (BTC):**
`bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh`

**Ethereum (ETH):**
`0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6`

**USDT (TRC20):**
`TQn9Y2khDD8vqXjqXjqXjqXjqXjqXjqXjq`

💰 После отправки средств, отправьте скриншот транзакции в поддержку.
⏱️ Доступ будет предоставлен в течение 1-2 часов после подтверждения.
        """
        
        keyboard = [
            [
                InlineKeyboardButton("✅ Я оплатил", callback_data="crypto_paid")
            ],
            [
                InlineKeyboardButton("⬅️ Назад", callback_data="back_to_payment")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(crypto_text, reply_markup=reply_markup)
    
    async def show_terms(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показать договор оферты"""
        query = update.callback_query
        await query.answer()
        
        terms_text = """
📄 **Договор оферты**

**1. Общие положения**
- Данный бот предоставляет доступ к закрытому каналу "ОСНОВА"
- Оплата производится в рублях, долларах или евро
- Подписка автоматически продлевается каждые 30 дней

**2. Условия использования**
- Запрещено передавать доступ третьим лицам
- Запрещено копировать и распространять контент
- Администрация оставляет за собой право прекратить доступ

**3. Возврат средств**
- Возврат возможен в течение 7 дней с момента оплаты
- При нарушении правил возврат не производится

**4. Конфиденциальность**
- Ваши данные используются только для предоставления доступа
- Мы не передаем информацию третьим лицам

Полный текст договора: https://your-terms-url.com
        """
        
        keyboard = [
            [
                InlineKeyboardButton("⬅️ Назад", callback_data="back_to_payment")
            ]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(terms_text, reply_markup=reply_markup)
