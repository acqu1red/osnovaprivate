from fastapi import FastAPI
from fastapi.responses import JSONResponse
from telegram import Bot, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import CommandHandler, CallbackQueryHandler, Updater

app = FastAPI()

TELEGRAM_TOKEN = 'YOUR_TELEGRAM_BOT_TOKEN'

bot = Bot(token=TELEGRAM_TOKEN)

@app.get("/")
async def root():
    return {"message": "Hello, World!"}

@app.post("/webhook")
async def webhook(update: Update):
    if update.message:
        chat_id = update.message.chat_id
        if update.message.text == '/start':
            start_message(chat_id)
    elif update.callback_query:
        handle_callback_query(update.callback_query)
    return JSONResponse(status_code=200)

def start_message(chat_id):
    text = ("Доброго времени суток, *пользователь*.
"
            "Ты не просто в бот — ты в шлюзе закрытого канала ОСНОВА, где знания не просто ценные, жизненно необходимые.\n"
            "💳 Подписка - ежемесячная 1500₽ или ~15$, оплата принимается в любой валюте и крипте.\n"
            "⬇️ Ниже — кнопка. Жмешь — и проходишь туда, где люди не ноют, а ебут этот мир в обе щеки.")
    keyboard = [
        [InlineKeyboardButton("Подробнее о канале 📚", callback_data='more_info')],
        [InlineKeyboardButton("Задать вопрос ❓", callback_data='ask_question')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    bot.send_message(chat_id=chat_id, text=text, reply_markup=reply_markup, parse_mode='Markdown')

def handle_callback_query(callback_query):
    chat_id = callback_query.message.chat_id
    if callback_query.data == 'more_info':
        more_info_message(chat_id)
    elif callback_query.data == 'ask_question':
        ask_question(chat_id)


def more_info_message(chat_id):
    text = ("ФОРМУЛА — это золотой рюкзак знаний, с которым ты безальтернативно вылезешь из любой жопы.\n"
            "Тут не просто \"мотивация\" и \"развитие\", а рабочие схемы, которые ты не найдёшь даже если будешь копать ебучий Даркнет.\n"
            "🧠 Подкасты с таймкодами — от ПРОФАЙЛИНГА до манипуляций баб, от ПСИХОТИПОВ до коммуникации на уровне спецслужб\n"
            "💉 Органический БИОХАКИНГ — почему тебе плохо и как через неделю почувствовать себя богом\n"
            "💸 Уроки по ФРОДУ, где из нуля делается $5000+ в месяц, если не еблан\n"
            "🧱 Как выстроить дисциплину, отшить самобичевание и наконец стать машиной, а не мямлей\n"
            "📈 Авторские стратегии по трейдингу — от $500/мес на автопилоте\n"
            "⚡ Скальпинг и биржи — как хитрить систему, не теряя бабки на комиссиях\n"
            "🎥 Стримы каждые 2 недели, где разбираю вопросы подписчиков: здоровье, деньги, психика, мышление\n"
            "И это лишь малая часть того, что тебя ожидает в Формуле.\n"
            "Это не просто канал. Это сила, которая перестраивает твое мышление под нового тебя.\n"
            "Вокруг тебя — миллион способов сделать бабки, использовать людей и не пахать, пока другие пашут.\n"
            "Ты будешь считывать людей с его профиля в мессенджере, зарабатывать из воздуха и нести себя как король, потому что знаешь больше, чем они когда-либо поймут.\n"
            "Кнопка внизу ⬇️. Там не просто инфа. Там выход из стада.\n"
            "Решай.")
    keyboard = [
        [InlineKeyboardButton("Задать вопрос ❓", callback_data='ask_question')],
        [InlineKeyboardButton("Назад 🔙", callback_data='back')]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    bot.send_message(chat_id=chat_id, text=text, reply_markup=reply_markup)

def ask_question(chat_id):
    # Здесь будет интеграция с mini apps
    bot.send_message(chat_id=chat_id, text="Открываю mini apps для обратной связи...")


def main():
    updater = Updater(token=TELEGRAM_TOKEN, use_context=True)
    dp = updater.dispatcher
    dp.add_handler(CommandHandler('start', start_message))
    dp.add_handler(CallbackQueryHandler(handle_callback_query))
    updater.start_polling()
    updater.idle()

if __name__ == "__main__":
    main()
