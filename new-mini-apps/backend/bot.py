from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackQueryHandler, CallbackContext
from queue import Queue

# Функция для обработки команды /start
async def start(update: Update, context: CallbackContext) -> None:
    user_first_name = update.effective_user.first_name
    message = (
        f"Доброго времени суток, {user_first_name}.\n\n"
        "Ты не просто в бот — ты в шлюзе закрытого канала ОСНОВА, где знания не просто ценные, жизненно необходимые.\n\n"
        "💳 Подписка - ежемесячная 1500₽ или ~15$, оплата принимается в любой валюте и крипте.\n"
        "⬇️ Ниже — кнопка. Жмешь — и проходишь туда, где люди не ноют, а ебут этот мир в обе щеки."
    )

    keyboard = [
        [InlineKeyboardButton("Подробнее о канале 📚", callback_data='more_info')],
        [InlineKeyboardButton("Задать вопрос ❓", callback_data='ask_question')]
    ]

    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')

# Функция для обработки нажатий на инлайн-кнопки
async def button(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    await query.answer()

    if query.data == 'more_info':
        message = (
            "ФОРМУЛА — это золотой рюкзак знаний, с которым ты безальтернативно вылезешь из любой жопы.\n\n"
            "Тут не просто \"мотивация\" и \"развитие\", а рабочие схемы, которые ты не найдёшь даже если будешь копать ебучий Даркнет.\n\n"
            "🧠 Подкасты с таймкодами — от ПРОФАЙЛИНГА до манипуляций баб, от ПСИХОТИПОВ до коммуникации на уровне спецслужб\n"
            "💉 Органический БИОХАКИНГ — почему тебе плохо и как через неделю почувствовать себя богом\n"
            "💸 Уроки по ФРОДУ, где из нуля делается $5000+ в месяц, если не еблан\n"
            "🧱 Как выстроить дисциплину, отшить самобичевание и наконец стать машиной, а не мямлей\n"
            "📈 Авторские стратегии по трейдингу — от $500/мес на автопилоте\n"
            "⚡ Скальпинг и биржи — как хитрить систему, не теряя бабки на комиссиях\n"
            "🎥 Стримы каждые 2 недели, где разбираю вопросы подписчиков: здоровье, деньги, психика, мышление\n\n"
            "И это лишь малая часть того, что тебя ожидает в Формуле.\n\n"
            "Это не просто канал. Это сила, которая перестраивает твое мышление под нового тебя.\n"
            "Вокруг тебя — миллион способов сделать бабки, использовать людей и не пахать, пока другие пашут.\n\n"
            "Ты будешь считывать людей с его профиля в мессенджере, зарабатывать из воздуха и нести себя как король, потому что знаешь больше, чем они когда-либо поймут.\n\n"
            "Кнопка внизу ⬇️. Там не просто инфа. Там выход из стада.\nРешай."
        )
        keyboard = [
            [InlineKeyboardButton("Задать вопрос ❓", callback_data='ask_question')],
            [InlineKeyboardButton("Назад 🔙", callback_data='back')]
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await query.edit_message_text(text=message, reply_markup=reply_markup)

    elif query.data == 'ask_question':
        # Открытие miniapps через Telegram
        await query.edit_message_text(text="Открытие miniapps...", reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("Открыть miniapps", url="https://t.me/OSNOVAprivate_bot/myapp")]
        ]))

    elif query.data == 'back':
        await start(update, context)

async def handle_message(update: Update, context: CallbackContext) -> None:
    if context.user_data.get('awaiting_question'):
        question = update.message.text
        # Сохранение вопроса в базе данных или отправка администратору
        await update.message.reply_text("Ваш вопрос получен. Мы свяжемся с вами в ближайшее время.")
        context.user_data['awaiting_question'] = False
    else:
        await update.message.reply_text("Пожалуйста, используйте команду /start для начала.")

# Основная функция для запуска бота
def main() -> None:
    application = ApplicationBuilder().token("8354723250:AAEWcX6OojEi_fN-RAekppNMVTAsQDU0wvo").build()

    application.add_handler(CommandHandler('start', start))
    application.add_handler(CallbackQueryHandler(button))

    application.run_polling()

if __name__ == '__main__':
    main()
