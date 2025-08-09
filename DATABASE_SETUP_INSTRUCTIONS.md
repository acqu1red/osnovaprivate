# Инструкция по настройке базы данных Supabase для OSNOVA Bot

## 🔧 Настройка базы данных

### 1. Откройте Supabase Dashboard
1. Перейдите в [Supabase Dashboard](https://supabase.com/dashboard)
2. Войдите в свой проект

### 2. Выполните SQL команды
1. Откройте **SQL Editor** в левом меню
2. Скопируйте и выполните весь код из файла `supabase_setup.sql`
3. Нажмите **RUN** для выполнения всех команд

### 3. Что создает SQL скрипт:

#### 📋 Таблицы:
- **`user_roles`** - роли пользователей (admin/user)
- **`support_messages`** - все сообщения поддержки

#### 👑 Автоматически создаются администраторы:
- ID: `8354723250` (username: `acqu1red`)
- ID: `7365307696` (username: `cashm3thod`)

#### 🔧 Функции базы данных:
- `add_support_message()` - добавление сообщений
- `get_admin_threads()` - получение всех тредов для админа
- `get_thread_messages()` - получение сообщений треда
- `mark_messages_as_read()` - отметка сообщений как прочитанных

#### 🔒 Настройки безопасности:
- Row Level Security (RLS) включена
- Правильные политики доступа к данным

## ✅ Проверка корректности

После выполнения SQL скрипта проверьте:

1. **Таблицы созданы:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('user_roles', 'support_messages');
   ```

2. **Администраторы добавлены:**
   ```sql
   SELECT * FROM user_roles WHERE role = 'admin';
   ```

3. **Функции созданы:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name LIKE '%support%';
   ```

## 🚨 Важные примечания

- **Не удаляйте** таблицы `messages` или `support_messages`, если они уже есть
- **Создайте резервную копию** перед выполнением SQL
- SQL скрипт использует `IF NOT EXISTS` для безопасного выполнения
- Все изменения обратимы

## 🔄 Обновление структуры

Если нужно обновить структуру БД:
1. Сначала создайте backup текущих данных
2. Выполните новый SQL скрипт
3. Проверьте корректность работы

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в Supabase Dashboard → Logs
2. Убедитесь, что все функции созданы
3. Проверьте права доступа к таблицам

---

**После выполнения этих шагов ваша база данных будет готова для работы с исправленной системой сообщений!**
