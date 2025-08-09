-- ====================================================
-- Структура базы данных для OSNOVA Bot
-- ====================================================

-- 1. Таблица для хранения ролей пользователей
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица для хранения сообщений поддержки
CREATE TABLE IF NOT EXISTS support_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id TEXT NOT NULL, -- Идентификатор переписки (telegram_id пользователя)
    sender_telegram_id BIGINT NOT NULL,
    sender_role TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user', 'admin', 'moderator')),
    sender_username TEXT,
    sender_first_name TEXT,
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'voice')),
    reply_to_message_id UUID REFERENCES support_messages(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    -- Индексы для быстрого поиска
    INDEX idx_thread_id (thread_id),
    INDEX idx_sender_telegram_id (sender_telegram_id),
    INDEX idx_created_at (created_at)
);

-- 3. Вставка администраторов
INSERT INTO user_roles (telegram_id, username, role, first_name) VALUES
(8354723250, 'acqu1red', 'admin', 'Администратор'),
(7365307696, 'cashm3thod', 'admin', 'Администратор')
ON CONFLICT (telegram_id) DO UPDATE SET
    role = EXCLUDED.role,
    username = EXCLUDED.username,
    updated_at = NOW();

-- 4. Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Триггер для user_roles
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Политики RLS (Row Level Security)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Политика для чтения ролей пользователей (все могут читать)
CREATE POLICY "Allow read user_roles" ON user_roles FOR SELECT USING (true);

-- Политика для записи в support_messages (все могут писать)
CREATE POLICY "Allow insert support_messages" ON support_messages FOR INSERT WITH CHECK (true);

-- Политика для чтения support_messages (пользователи видят свои сообщения + админы видят все)
CREATE POLICY "Allow read own support_messages" ON support_messages FOR SELECT USING (
    sender_telegram_id = (SELECT telegram_id FROM user_roles WHERE role = 'admin' LIMIT 1)
    OR thread_id = sender_telegram_id::TEXT
    OR sender_telegram_id IN (SELECT telegram_id FROM user_roles WHERE role IN ('admin', 'moderator'))
);

-- 6. Создание индексов для производительности
CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created 
ON support_messages (thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_sender_created 
ON support_messages (sender_telegram_id, created_at DESC);

-- 7. Функция для получения роли пользователя
CREATE OR REPLACE FUNCTION get_user_role(user_telegram_id BIGINT)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM user_roles 
    WHERE telegram_id = user_telegram_id;
    
    IF user_role IS NULL THEN
        RETURN 'user';
    ELSE
        RETURN user_role;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 8. Функция для добавления сообщения в поддержку
CREATE OR REPLACE FUNCTION add_support_message(
    p_thread_id TEXT,
    p_sender_telegram_id BIGINT,
    p_sender_username TEXT DEFAULT NULL,
    p_sender_first_name TEXT DEFAULT NULL,
    p_message_text TEXT,
    p_message_type TEXT DEFAULT 'text'
)
RETURNS UUID AS $$
DECLARE
    new_message_id UUID;
    sender_role TEXT;
BEGIN
    -- Определяем роль отправителя
    SELECT get_user_role(p_sender_telegram_id) INTO sender_role;
    
    -- Добавляем роль пользователя, если её нет
    INSERT INTO user_roles (telegram_id, username, first_name, role)
    VALUES (p_sender_telegram_id, p_sender_username, p_sender_first_name, sender_role)
    ON CONFLICT (telegram_id) DO UPDATE SET
        username = COALESCE(EXCLUDED.username, user_roles.username),
        first_name = COALESCE(EXCLUDED.first_name, user_roles.first_name),
        updated_at = NOW();
    
    -- Добавляем сообщение
    INSERT INTO support_messages (
        thread_id,
        sender_telegram_id,
        sender_role,
        sender_username,
        sender_first_name,
        message_text,
        message_type
    ) VALUES (
        p_thread_id,
        p_sender_telegram_id,
        sender_role,
        p_sender_username,
        p_sender_first_name,
        p_message_text,
        p_message_type
    ) RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Функция для получения всех тредов для админа
CREATE OR REPLACE FUNCTION get_admin_threads()
RETURNS TABLE (
    thread_id TEXT,
    user_telegram_id BIGINT,
    username TEXT,
    first_name TEXT,
    last_message_text TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        sm.thread_id,
        sm.sender_telegram_id as user_telegram_id,
        ur.username,
        ur.first_name,
        (
            SELECT message_text 
            FROM support_messages sm2 
            WHERE sm2.thread_id = sm.thread_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ) as last_message_text,
        (
            SELECT created_at 
            FROM support_messages sm2 
            WHERE sm2.thread_id = sm.thread_id 
            ORDER BY created_at DESC 
            LIMIT 1
        ) as last_message_time,
        (
            SELECT COUNT(*) 
            FROM support_messages sm2 
            WHERE sm2.thread_id = sm.thread_id 
            AND sm2.is_read = FALSE 
            AND sm2.sender_role = 'user'
        ) as unread_count
    FROM support_messages sm
    LEFT JOIN user_roles ur ON ur.telegram_id = sm.sender_telegram_id::BIGINT
    ORDER BY last_message_time DESC;
END;
$$ LANGUAGE plpgsql;

-- 10. Функция для получения истории сообщений в треде
CREATE OR REPLACE FUNCTION get_thread_messages(p_thread_id TEXT)
RETURNS TABLE (
    id UUID,
    sender_telegram_id BIGINT,
    sender_role TEXT,
    sender_username TEXT,
    sender_first_name TEXT,
    message_text TEXT,
    message_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sm.id,
        sm.sender_telegram_id,
        sm.sender_role,
        sm.sender_username,
        sm.sender_first_name,
        sm.message_text,
        sm.message_type,
        sm.created_at,
        sm.is_read
    FROM support_messages sm
    WHERE sm.thread_id = p_thread_id
    ORDER BY sm.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 11. Функция для отметки сообщений как прочитанных
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_thread_id TEXT, p_reader_telegram_id BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE support_messages 
    SET is_read = TRUE 
    WHERE thread_id = p_thread_id 
    AND sender_telegram_id != p_reader_telegram_id;
END;
$$ LANGUAGE plpgsql;

-- ====================================================
-- Для тестирования можно добавить тестовые данные:
-- ====================================================

-- Добавление тестового пользователя
-- INSERT INTO user_roles (telegram_id, username, first_name, role) 
-- VALUES (123456789, 'testuser', 'Тест Пользователь', 'user');

-- Добавление тестового сообщения
-- SELECT add_support_message(
--     '123456789',
--     123456789,
--     'testuser', 
--     'Тест Пользователь',
--     'Тестовое сообщение от пользователя'
-- );
