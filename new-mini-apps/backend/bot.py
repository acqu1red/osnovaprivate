from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Updater, CommandHandler, CallbackQueryHandler, CallbackContext

# Функция для обработки команды /start
def start(update: Update, context: CallbackContext) -> None:
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
    update.message.reply_text(message, reply_markup=reply_markup, parse_mode='Markdown')

# Функция для обработки нажатий на инлайн-кнопки
def button(update: Update, context: CallbackContext) -> None:
    query = update.callback_query
    query.answer()

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
        query.edit_message_text(text=message, reply_markup=reply_markup)

    elif query.data == 'ask_question':
        # Здесь будет интеграция с miniapps
        query.edit_message_text(text="Интеграция с miniapps пока не реализована.")

    elif query.data == 'back':
        start(update, context)

# Основная функция для запуска бота
def main() -> None:
    updater = Updater("8354723250:AAEWcX6OojEi_fN-RAekppNMVTAsQDU0wvo")

    updater.dispatcher.add_handler(CommandHandler('start', start))
    updater.dispatcher.add_handler(CallbackQueryHandler(button))

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
