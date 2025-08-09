// OSNOVA Mini App - Main Application Logic
class OSNOVAMiniApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentUser = null;
        this.isAdmin = false;
        this.selectedUserId = null;
        this.selectedUserData = null;
        // Изначально пусто; для админа наполним из Supabase, для пользователя — по мере отправки
        this.questions = {};
        this.currentView = 'chat'; // 'chat', 'admin-panel', 'user-chat'
        this.sb = null; // supabase client (optional)
        this.sbSession = null; // supabase auth session (optional)
        
        this.init();
    }
    
    async init() {
        // Инициализация Telegram Web App
        this.tg.ready();
        this.tg.expand();
        this.tg.MainButton.hide();
        
        // Скрываем стандартный заголовок Telegram Web App
        this.hideTelegramHeader();
        
        // Получаем данные пользователя
        this.currentUser = {
            id: this.tg.initDataUnsafe?.user?.id || 'unknown',
            username: this.tg.initDataUnsafe?.user?.username || 'unknown',
            first_name: this.tg.initDataUnsafe?.user?.first_name || 'User'
        };
        
        // Инициализация Supabase при наличии конфигурации
        const cfg = window.WEB_CONFIG || {};
        if (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && window.supabase) {
            // Поддерживаем синтаксис createClient из CDN
            this.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
        }
        
        // Проверяем права администратора (ID/username или query-параметр admin=1)
        const ADMIN_IDS = [8354723250, 7365307696];
        const ADMIN_USERNAMES = ['acqu1red', 'cashm3thod'];
        const currentId = Number(this.currentUser.id);
        const currentUsername = String(this.currentUser.username || '').toLowerCase();
        const url = new URL(window.location.href);
        const adminFlag = url.searchParams.get('admin');
        this.isAdmin = Boolean(
            ADMIN_IDS.includes(currentId) ||
            ADMIN_USERNAMES.includes(currentUsername) ||
            adminFlag === '1'
        );

        // Если есть параметры в URL от кнопки "Ответить" — открываем сразу чат с пользователем
        this.bootstrapReplyContextFromURL();
        
        // Авторизуемся анонимно в Supabase при необходимости
        if (this.sb) {
            await this.ensureSupabaseSession();
        }
        
        // Инициализируем интерфейс
        this.initUI();
        this.bindEvents();
        // Для обычного пользователя: загрузим историю из Supabase
        if (!this.isAdmin && this.sb) {
            await this.fetchMessagesForMe();
        this.loadUserMessages();
        }

        // Если подключен Supabase — подписываемся и грузим сообщения
        if (this.sb) {
            this.subscribeRealtime();
            await this.fetchAllMessagesFromCloud();
            // Если это админ — сразу показываем админ‑панель
            if (this.isAdmin) {
                this.showAdminPanel();
            }
        }
        
        // Показываем кнопку админ-панели только для администраторов
        if (this.isAdmin) {
            this.showAdminPanelButton();
        }
        
        // Периодически проверяем и скрываем верхнюю часть
        setInterval(() => {
            this.hideTelegramHeader();
        }, 1000);
    }
    
    initUI() {
        // Инициализация интерфейса без приветственного сообщения
        // Пытаемся показать аватар пользователя в шапке, если Telegram его передал
        try {
            const avatar = document.getElementById('chat-avatar');
            const photoUrl = this.tg.initDataUnsafe?.user?.photo_url;
            if (avatar && photoUrl) {
                avatar.src = photoUrl;
                avatar.style.display = 'block';
            }
        } catch (e) {
            // ignore
        }
    }

    bootstrapReplyContextFromURL() {
        try {
            const url = new URL(window.location.href);
            const userId = url.searchParams.get('userId');
            const messageId = url.searchParams.get('messageId');
            const firstName = url.searchParams.get('first_name');
            const username = url.searchParams.get('username');
            const question = url.searchParams.get('question');

            if (userId && this.isAdmin) {
                // Инициализируем структуру для пользователя, если ее нет
                if (!this.questions[userId]) {
                    this.questions[userId] = {
                        user: {
                            id: userId,
                            username: username || 'скрыт',
                            first_name: firstName || 'Пользователь'
                        },
                        messages: []
                    };
                }

                // Если прилетел вопрос — добавим его в сообщения, чтобы админ видел контекст
                if (question) {
                    this.questions[userId].messages.push({
                        id: messageId || Date.now(),
                        text: question,
                        type: 'user',
                        timestamp: new Date(),
                        userId: userId,
                        username: username || 'скрыт'
                    });
                }

                // Открываем чат с этим пользователем
                setTimeout(() => {
                    this.showUserChat(userId);
                }, 0);
            }
        } catch (e) {
            console.error('bootstrapReplyContextFromURL error:', e);
        }
    }
    
    hideTelegramHeader() {
        // Скрываем стандартный заголовок Telegram Web App
        setTimeout(() => {
            // Скрываем все элементы верхней панели
            const elementsToHide = [
                '.tgme_widget_message',
                '.tgme_widget_message_bubble',
                '.tgme_widget_message_wrap',
                '.tgme_widget_message_bubble_wrap',
                '.tgme_widget_message_text',
                '[data-js="widget-message"]',
                '.widget-message',
                '.tgme_widget_message_author',
                '.tgme_widget_message_author_name',
                '.tgme_widget_message_author_username',
                '.tgme_widget_message_author_photo',
                '.tgme_widget_message_author_photo_wrap',
                '.tgme_widget_message_author_photo_img',
                '.tgme_widget_message_author_photo_placeholder'
            ];
            
            elementsToHide.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.height = '0';
                    el.style.overflow = 'hidden';
                    el.style.margin = '0';
                    el.style.padding = '0';
                });
            });
            
            // Также скрываем любые элементы с текстом "OSNOVA" или "мини-приложение"
            const allElements = document.querySelectorAll('*');
            allElements.forEach(el => {
                if (el.textContent && (
                    el.textContent.includes('OSNOVA') || 
                    el.textContent.includes('мини-приложение') ||
                    el.textContent.includes('ОСНОВА: доступ к системе') ||
                    el.textContent.includes('Доступ к закрытому каналу') ||
                    el.textContent.includes('SNOVA')
                )) {
                    el.style.display = 'none';
                    el.style.visibility = 'hidden';
                    el.style.height = '0';
                    el.style.overflow = 'hidden';
                }
            });
            
            // Скрываем все элементы с изображениями логотипов
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                if (img.src && (
                    img.src.includes('logo') || 
                    img.src.includes('avatar') ||
                    img.alt && img.alt.includes('OSNOVA')
                )) {
                    img.style.display = 'none';
                    img.style.visibility = 'hidden';
                }
            });
        }, 100);
    }
    
    showAdminPanelButton() {
        const adminPanelBtn = document.getElementById('admin-panel-btn');
        if (adminPanelBtn) {
            adminPanelBtn.style.display = 'block';
        }
    }
    
    bindEvents() {
        // Отправка сообщения
        document.getElementById('send-btn').addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Enter для отправки
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Прикрепление файла
        document.getElementById('attach-btn').addEventListener('click', () => {
            this.attachFile();
        });
        
        // Кнопка админ-панели
        const adminPanelBtn = document.getElementById('admin-panel-btn');
        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => {
                this.showAdminPanel();
            });
        }
        
        // Админ-панель
        if (this.isAdmin) {
            document.getElementById('back-to-chat').addEventListener('click', () => {
                this.showChat();
            });
        }
    }
    
    sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text) return;
        
        // Создаем сообщение
        const message = {
            id: Date.now(),
            text: text,
            type: 'user',
            timestamp: new Date(),
            userId: this.currentUser.id,
            username: this.currentUser.username,
            status: 'pending'
        };
        
        // Добавляем в интерфейс
        this.addMessage(message);
        
        // Сохраняем в локальное хранилище (каждое сообщение — отдельное событие)
        this.saveMessage(message);
        
        // Отправляем в Telegram бота (каждое сообщение — отдельное web_app_data)
        this.sendToBot(message);
        
        // Очищаем поле ввода
        input.value = '';
        
        // Показываем статус
        this.showStatus('Сообщение отправлено!', 'success');
    }
    
    addMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        // Отправитель = тот, кто пишет сейчас (его сообщение слева и бежевое)
        const isSelf = (this.isAdmin && message.type === 'admin') || (!this.isAdmin && message.type === 'user');
        const sideClass = isSelf ? 'self' : 'other';
        messageElement.className = `message ${sideClass}`;
        
        let senderName = '';
        if (message.type === 'admin') {
            // Для сообщений администратора показываем "Администратор ✓"
            senderName = '<div class="message-sender">Администратор <span class="verified-badge-small">✓</span></div>';
        }
        
        const checks = this.renderChecks(message.status);
        messageElement.innerHTML = `
            ${senderName}
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-meta">
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
                <span class="message-status">${checks}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    saveMessage(message) {
        // Всегда сохраняем переписку в оперативной памяти
        const ownerId = this.isAdmin
            ? String(message.userId)
            : String(this.sbSession?.user?.id || this.currentUser.id);
        if (!this.questions[ownerId]) {
            this.questions[ownerId] = {
                user: {
                    id: ownerId,
                    username: message.username || this.currentUser.username,
                    first_name: this.currentUser.first_name
                },
                messages: []
            };
        }
        this.questions[ownerId].messages.push(message);
        // Всегда дублируем в облако, если доступно (и для пользователя, и для админа)
        this.saveMessageToCloud(message);
    }
    
    sendToBot(message) {
        // Формируем данные для отправки боту
        const botData = {
            type: 'new_question',
            data: {
                user: {
                    id: message.userId,
                    username: message.username,
                    first_name: this.currentUser.first_name
                },
                question: message.text,
                timestamp: message.timestamp,
                message_id: message.id
            }
        };
        
        // Отправляем данные в бота через Telegram Web App
        this.tg.sendData(JSON.stringify(botData));
        
        // Также логируем локально для диагностики
        console.log('sendToBot ->', botData);
    }

    // ====== Облачное хранилище (опционально) ======
    async saveMessageToCloud(message) {
        if (!this.sb) return;
        try {
            await this.ensureSupabaseSession();
            const sessionUserId = this.sbSession?.user?.id || null;
            // Определяем ключ треда по Telegram ID собеседника
            const threadTelegramId = this.isAdmin ? String(message.userId) : String(this.currentUser.id);
            // Пытаемся писать в таблицу messages (как в вашем SQL). Если есть support_messages — тоже поддержим.
            const commonRow = {
                user_id: String(sessionUserId || this.currentUser.id),
                username: this.currentUser.username || null,
                message: message.text,
                author_type: message.type || 'user',
                created_at: new Date(message.timestamp).toISOString(),
                telegram_id: threadTelegramId
            };
            // Сначала пробуем таблицу messages по вашему SQL
            let insertRes = await this.sb.from('messages').insert(commonRow).select('id,created_at');
            if (insertRes.error) {
                // Если колонок нет, пробуем без telegram_id
                if (String(insertRes.error.message || '').includes('telegram_id')) {
                    const { error } = await this.sb.from('messages').insert({
                        user_id: commonRow.user_id,
                        username: commonRow.username,
                        message: commonRow.message,
                        author_type: commonRow.author_type,
                        created_at: commonRow.created_at,
                    });
                    if (error) throw error;
                } else if (String(insertRes.error.message || '').includes('relation') || String(insertRes.error.message || '').includes('does not exist')) {
                    // Если таблицы messages нет, используем support_messages
                    const { error } = await this.sb.from('support_messages').insert({
                        user_id: commonRow.user_id,
                        username: commonRow.username,
                        author_type: commonRow.author_type,
                        text: commonRow.message,
                        timestamp: commonRow.created_at,
                    });
                    if (error) throw error;
                } else {
                    throw insertRes.error;
                }
            }
            // Успешная отправка — обновим статус сообщения в UI
            message.status = 'delivered';
        } catch (e) {
            console.error('saveMessageToCloud error:', e);
        }
    }

    async fetchAllMessagesFromCloud() {
        if (!this.sb) return;
        try {
            // Пытаемся сначала читать из messages (ваш SQL), затем fallback на support_messages
            let data = null;
            let error = null;
            let fromMessages = true;
            let res = await this.sb
                .from('messages')
                .select('id,user_id,username,message,author_type,created_at,telegram_id')
                .order('id', { ascending: true });
            if (res.error) {
                fromMessages = false;
                const res2 = await this.sb
                    .from('support_messages')
                    .select('id,user_id,username,author_type,text,timestamp')
                    .order('id', { ascending: true });
                data = res2.data;
                error = res2.error;
            } else {
                data = res.data;
                error = res.error;
            }
            if (error) throw error;
            // Полная ресинхронизация локальной структуры
            this.questions = {};
            data.forEach(row => {
                const telegramId = fromMessages ? (row.telegram_id ? String(row.telegram_id) : null) : null;
                const chatKey = telegramId || (row.username || row.user_id);
                const userId = String(chatKey);
                if (!this.questions[userId]) {
                    this.questions[userId] = {
                        user: {
                            id: userId,
                            username: row.username || 'скрыт',
                            first_name: row.username || 'Пользователь'
                        },
                        messages: []
                    };
                }
                const msg = fromMessages
                    ? { id: row.id, text: row.message, type: row.author_type || 'user', timestamp: row.created_at, userId, username: row.username || 'скрыт' }
                    : { id: row.id, text: row.text, type: row.author_type, timestamp: row.timestamp, userId, username: row.username || 'скрыт' };
                this.questions[userId].messages.push(msg);
            });
            if (this.currentView === 'admin-panel') this.loadUsersList();
        } catch (e) {
            console.error('fetchAllMessagesFromCloud error:', e);
        }
    }

    subscribeRealtime() {
        if (!this.sb) return;
        try {
            // Подписки и на messages, и на support_messages
            this.sb.channel('messages_ins')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                    const row = payload.new;
                    const chatKey = row.telegram_id ? String(row.telegram_id) : (row.username || row.user_id);
                    const userId = String(chatKey);
                    if (!this.questions[userId]) {
                        this.questions[userId] = {
                            user: { id: userId, username: row.username || 'скрыт', first_name: row.username || 'Пользователь' },
                            messages: []
                        };
                    }
                    const msg = { id: row.id, text: row.message, type: row.author_type || 'user', timestamp: row.created_at, userId, username: row.username || 'скрыт', status: 'read' };
                    this.questions[userId].messages.push(msg);
                    if (this.currentView === 'user-chat' && this.selectedUserId === userId) this.addMessage(msg);
                    if (this.currentView === 'admin-panel') this.loadUsersList();
                })
                .subscribe();
            this.sb.channel('support_messages_ins')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages' }, (payload) => {
                    const row = payload.new;
                    const userId = String(row.user_id);
                    if (!this.questions[userId]) {
                        this.questions[userId] = {
                            user: { id: userId, username: row.username || 'скрыт', first_name: row.username || 'Пользователь' },
                            messages: []
                        };
                    }
                    const msg = { id: row.id, text: row.text, type: row.author_type, timestamp: row.timestamp, userId, username: row.username || 'скрыт' };
                    this.questions[userId].messages.push(msg);
                    if (this.currentView === 'user-chat' && this.selectedUserId === userId) this.addMessage(msg);
                    if (this.currentView === 'admin-panel') this.loadUsersList();
                })
                .subscribe();
        } catch (e) {
            console.error('subscribeRealtime error:', e);
        }
    }

    async ensureSupabaseSession() {
        if (!this.sb) return;
        try {
            const { data } = await this.sb.auth.getSession();
            this.sbSession = data.session;
            if (!this.sbSession) {
                const { data: signInData, error } = await this.sb.auth.signInAnonymously();
                if (error) throw error;
                this.sbSession = signInData.session;
            }
        } catch (e) {
            console.error('ensureSupabaseSession error:', e);
        }
    }

    async fetchMessagesForMe() {
        if (!this.sb) return;
        const me = this.sbSession?.user?.id;
        if (!me) return;
        try {
            const { data, error } = await this.sb
                .from('messages')
                .select('id,user_id,username,message,created_at')
                .eq('user_id', me)
                .order('id', { ascending: true });
            if (error) throw error;
            const userKey = String(me);
            this.questions[userKey] = {
                user: {
                    id: userKey,
                    username: this.currentUser.username || 'скрыт',
                    first_name: this.currentUser.first_name || 'Пользователь'
                },
                messages: data.map(r => ({
                    id: r.id,
                    text: r.message,
                    type: 'user',
                    timestamp: r.created_at,
                    userId: userKey,
                    username: r.username || this.currentUser.username || 'скрыт'
                }))
            };
        } catch (e) {
            console.error('fetchMessagesForMe error:', e);
        }
    }
    
    sendToTelegramAPI(data) {
        // Отправляем уведомление администраторам через бота
        const adminMessage = this.formatAdminMessage(data.data);
        
        // Создаем инлайн-клавиатуру для ответа
        const inlineKeyboard = {
            inline_keyboard: [[
                {
                    text: "💬 Ответить",
                    callback_data: `reply_${data.data.user.id}_${data.data.message_id}`
                }
            ]]
        };
        
        // Отправляем сообщение администраторам
        this.sendToAdmins(adminMessage, inlineKeyboard);
    }
    
    formatAdminMessage(data) {
        const username = data.user.username ? `@${data.user.username}` : 'скрыт';
        const firstName = data.user.first_name || 'Пользователь';
        
        return `🔔 Новый запрос от пользователя
        
👤 Имя: ${firstName}
📝 Username: ${username}
🆔 ID: ${data.user.id}

💬 Сообщение:
${data.question}

⏰ Время: ${this.formatTime(data.timestamp)}

💡 Нажмите "Ответить" для быстрого ответа через Mini App`;
    }
    
    sendToAdmins(message, keyboard) {
        // Отправляем сообщение администраторам
        const adminIds = [8354723250, 7365307696];
        const adminUsernames = ['acqu1red', 'cashm3thod'];
        
        adminIds.forEach((adminId, idx) => {
            // Здесь должна быть интеграция с Telegram Bot API
            // Для демонстрации используем console.log
            console.log(`Отправка администратору ${adminId} (@${adminUsernames[idx]}):`, message);
            console.log('Клавиатура:', keyboard);
        });
    }
    
    loadUserMessages() {
        const userMessages = this.questions[this.currentUser.id];
        if (userMessages) {
            userMessages.messages.forEach(message => {
                this.addMessage(message);
            });
        }
    }
    
    showAdminPanel() {
        this.currentView = 'admin-panel';
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        this.loadUsersList();
    }

    
    showChat() {
        this.currentView = 'chat';
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        
        // Очищаем сообщения и загружаем свои
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        this.loadUserMessages();
        
        // Обновляем заголовок
        document.querySelector('.chat-title').textContent = 'Поддержка канала ФОРМУЛА';
    }
    
    showUserChat(userId) {
        this.currentView = 'user-chat';
        this.selectedUserId = userId;
        this.selectedUserData = this.questions[userId];
        
        // Скрываем админ-панель и показываем чат
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        
        // Обновляем заголовок с именем пользователя
        const userName = this.selectedUserData.user.first_name || this.selectedUserData.user.username || 'Пользователь';
        document.querySelector('.chat-title').textContent = `💬 Чат с ${userName}`;
        
        // Очищаем сообщения и загружаем сообщения выбранного пользователя
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        this.selectedUserData.messages.forEach(message => {
            this.addMessage(message);
        });
        
        // Обновляем обработчики событий для админского режима
        this.updateChatHandlers();
    }
    
    updateChatHandlers() {
        // Удаляем старые обработчики
        const sendBtn = document.getElementById('send-btn');
        const messageInput = document.getElementById('message-input');
        
        // Создаем новые обработчики для админского режима
        sendBtn.onclick = () => this.sendAdminMessage();
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendAdminMessage();
            }
        };
    }
    
    sendAdminMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text || !this.selectedUserId) return;
        
        // Создаем ответ администратора
        const reply = {
            id: Date.now(),
            text: text,
            type: 'admin',
            timestamp: new Date(),
            userId: this.selectedUserId,
            adminId: this.currentUser.id
        };
        
        // Добавляем в чат
        this.addMessage(reply);
        
        // Сохраняем ответ
        this.questions[this.selectedUserId].messages.push(reply);
        
        // Отправляем уведомление пользователю через бота
        this.sendUserNotification(reply);
        
        // Очищаем поле ввода
        input.value = '';
        
        // Показываем статус
        this.showStatus('Ответ отправлен!', 'success');
    }
    
    loadUsersList() {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        Object.keys(this.questions).forEach(userId => {
            const userData = this.questions[userId];
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-name">${userData.user.first_name || userData.user.username}</div>
                <div class="user-id">@${userData.user.username} (${userId})</div>
                <div class="user-message-count">${userData.messages.length} сообщений</div>
            `;
            
            userElement.addEventListener('click', () => {
                this.selectUser(userId);
            });
            
            usersList.appendChild(userElement);
        });
    }
    
    selectUser(userId) {
        // Обновляем активный класс
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.user-item').classList.add('active');
        
        // Показываем чат с пользователем
        this.showUserChat(userId);
    }
    
    sendUserNotification(reply) {
        const userData = this.questions[reply.userId];
        const adminName = this.currentUser.first_name || 'Администратор';
        
        const notification = {
            type: 'admin_reply',
            data: {
                userId: reply.userId,
                message: reply.text,
                adminId: reply.adminId,
                adminName: adminName,
                timestamp: reply.timestamp
            }
        };
        
        // Отправляем через Telegram Web App
        this.tg.sendData(JSON.stringify(notification));
        
        // Локально добавляем запись и для админа (чтобы история ответа отображалась сразу)
        this.saveMessage(reply);
    }
    
    sendUserMessage(userId, adminName, message) {
        const userMessage = `💬 Ответ от ${adminName}:

${message}

📱 Открыть чат: [OSNOVA Mini App]`;
        
        // Здесь должна быть интеграция с Telegram Bot API для отправки сообщения пользователю
        console.log(`Отправка пользователю ${userId}:`, userMessage);
    }
    
    attachFile() {
        // Создаем скрытый input для файла
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*,video/*,audio/*,application/*';
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileUpload(file);
            }
        });
        
        fileInput.click();
    }
    
    handleFileUpload(file) {
        // Создаем URL для файла
        const fileUrl = URL.createObjectURL(file);
        
        // Создаем сообщение с файлом
        const message = {
            id: Date.now(),
            text: `📎 ${file.name}`,
            type: 'user',
            timestamp: new Date(),
            userId: this.currentUser.id,
            username: this.currentUser.username,
            attachment: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: fileUrl
            }
        };
        
        // Добавляем в интерфейс
        this.addMessageWithAttachment(message);
        
        // Сохраняем сообщение
        this.saveMessage(message);
        
        // Отправляем в бота
        this.sendToBot(message);
    }
    
    addMessageWithAttachment(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        const isSelf = (this.isAdmin && message.type === 'admin') || (!this.isAdmin && message.type === 'user');
        const sideClass = isSelf ? 'self' : 'other';
        messageElement.className = `message ${sideClass}`;
        
        let senderName = '';
        if (message.type === 'admin') {
            // Для сообщений администратора показываем "Администратор ✓"
            senderName = '<div class="message-sender">Администратор <span class="verified-badge-small">✓</span></div>';
        }
        
        const checks = this.renderChecks(message.status);
        messageElement.innerHTML = `
            ${senderName}
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="file-attachment">
                <a href="${message.attachment.url}" target="_blank" download="${message.attachment.name}">
                    📎 ${message.attachment.name} (${this.formatFileSize(message.attachment.size)})
                </a>
            </div>
            <div class="message-meta">
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
                <span class="message-status">${checks}</span>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    showStatus(message, type) {
        const statusElement = document.createElement('div');
        statusElement.className = `status-message status-${type}`;
        statusElement.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(statusElement, container.firstChild);
        
        setTimeout(() => {
            statusElement.remove();
        }, 3000);
    }
    
    // Утилиты
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatTime(date) {
        return new Date(date).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    renderChecks(status) {
        // pending: одна серая галочка; delivered: две серые; read: две синие
        if (status === 'pending') {
            return `<svg class="checks-gray" viewBox="0 0 24 24" fill="none"><path d="M6 12l3 3 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        if (status === 'delivered') {
            return `<svg class="checks-gray" viewBox="0 0 24 24" fill="none"><path d="M5 13l3 3 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 14l3 3 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        }
        // read
        return `<svg class="checks-blue" viewBox="0 0 24 24" fill="none"><path d="M5 13l3 3 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 14l3 3 7-7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    loadQuestions() {
        // Больше не используем localStorage — данные приходят из Supabase
        return {};
    }
    
    saveQuestions() {
        // Больше не используем localStorage — no-op
        return;
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    // Сразу скрываем верхнюю часть
    const hideHeader = () => {
        const elements = document.querySelectorAll('*');
        elements.forEach(el => {
            if (el.textContent && (
                el.textContent.includes('OSNOVA') || 
                el.textContent.includes('мини-приложение') ||
                el.textContent.includes('ОСНОВА: доступ к системе') ||
                el.textContent.includes('Доступ к закрытому каналу') ||
                el.textContent.includes('SNOVA')
            )) {
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.height = '0';
                el.style.overflow = 'hidden';
            }
        });
    };
    
    // Выполняем сразу и через небольшие интервалы
    hideHeader();
    setTimeout(hideHeader, 50);
    setTimeout(hideHeader, 200);
    setTimeout(hideHeader, 500);
    
    new OSNOVAMiniApp();
});
