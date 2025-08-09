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
        // Для обычного пользователя: загрузим историю из Supabase и отобразим сообщения
        if (!this.isAdmin && this.sb) {
            await this.fetchUserMessages();
            this.loadUserMessages();
            
            // Добавляем периодическую перезагрузку сообщений для отладки
            setInterval(async () => {
                console.log('Reloading user messages...');
                await this.fetchUserMessages();
            }, 10000); // каждые 10 секунд
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
            username: this.currentUser.username
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
        const isSelf = this.isAdmin ? (message.type === 'admin') : (message.type === 'user');
        const sideClass = isSelf ? 'self' : 'other';
        messageElement.className = `message ${sideClass}`;
        
        let senderName = '';
        if (message.type === 'admin') {
            // Для сообщений администратора показываем "Администратор ✔"
            senderName = '<div class="message-sender">Администратор <span class="verified-badge-small">✔</span></div>';
        } else {
            // Для сообщений пользователя показываем его Telegram ник или имя
            if (this.isAdmin && this.selectedUserData) {
                // В админ-панели показываем данные выбранного пользователя
                const uname = this.selectedUserData.user.username;
                const label = uname ? `@${uname}` : (this.selectedUserData.user.first_name || 'Пользователь');
                senderName = `<div class="message-sender">${this.escapeHtml(label)}</div>`;
            } else {
                // Для обычного пользователя показываем его данные
                const uname = message.username || this.currentUser.username || '';
                const label = uname ? `@${uname}` : (this.currentUser.first_name || 'Пользователь');
                senderName = `<div class="message-sender">${this.escapeHtml(label)}</div>`;
            }
        }
        
        messageElement.innerHTML = `
            ${senderName}
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
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

    // ====== ПЕРЕПИСАННАЯ система облачного хранилища ======
    async saveMessageToCloud(message) {
        if (!this.sb) return;
        try {
            await this.ensureSupabaseSession();
            
            // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: Для всех сообщений thread_id = ID пользователя (не админа!)
            let threadId;
            if (this.isAdmin && this.selectedUserId) {
                // Админ пишет в тред пользователя
                threadId = String(this.selectedUserId);
            } else {
                // Пользователь пишет в свой тред
                threadId = String(this.currentUser.id);
            }
            
            const senderTelegramId = Number(this.currentUser.id);
            const senderRole = this.isAdmin ? 'admin' : 'user';
            const senderUsername = this.currentUser.username || null;
            const senderFirstName = this.isAdmin ? 
                (this.currentUser.first_name || 'Администратор') : 
                (this.currentUser.first_name || 'Пользователь');
            
            console.log('Saving message to cloud:', {
                threadId,
                senderTelegramId,
                senderRole,
                messageText: message.text
            });
            
            // Используем функцию add_support_message
            const { data, error } = await this.sb.rpc('add_support_message', {
                p_thread_id: threadId,
                p_sender_telegram_id: senderTelegramId,
                p_message_text: message.text,
                p_sender_username: senderUsername,
                p_sender_first_name: senderFirstName,
                p_message_type: 'text'
            });
            
            if (error) {
                console.error('RPC error, using fallback:', error);
                // Fallback к прямой вставке
                const fallbackData = {
                    thread_id: threadId,
                    sender_telegram_id: senderTelegramId,
                    sender_role: senderRole,
                    sender_username: senderUsername,
                    sender_first_name: senderFirstName,
                    message_text: message.text,
                    message_type: 'text'
                };
                
                const { error: fallbackError } = await this.sb
                    .from('support_messages')
                    .insert(fallbackData);
                
                if (fallbackError) {
                    console.error('Fallback insert error:', fallbackError);
                    throw fallbackError;
                }
            }
            
            console.log('Message saved successfully:', message.id);
        } catch (e) {
            console.error('saveMessageToCloud error:', e);
        }
    }

    async fetchAllMessagesFromCloud() {
        if (!this.sb) return;
        try {
            if (this.isAdmin) {
                // Для админа загружаем все треды
                await this.fetchAdminThreads();
            } else {
                // Для пользователя загружаем только свои сообщения
                await this.fetchUserMessages();
            }
        } catch (e) {
            console.error('fetchAllMessagesFromCloud error:', e);
        }
    }

    async fetchAdminThreads() {
        try {
            // Используем функцию get_admin_threads для получения всех тредов
            const { data: threads, error: threadsError } = await this.sb.rpc('get_admin_threads');
            
            if (threadsError) {
                // Fallback к прямому запросу
                const { data: messages, error } = await this.sb
                    .from('support_messages')
                    .select('*')
                    .order('created_at', { ascending: true });
                
                if (error) throw error;
                this.processMessages(messages);
                return;
            }

            // Очищаем текущие вопросы
            this.questions = {};
            
            // Для каждого треда загружаем сообщения
            for (const thread of threads || []) {
                await this.fetchThreadMessages(thread.thread_id, thread);
            }
            
            if (this.currentView === 'admin-panel') this.loadUsersList();
        } catch (e) {
            console.error('fetchAdminThreads error:', e);
        }
    }

    async fetchThreadMessages(threadId, threadInfo = null) {
        try {
            const { data: messages, error } = await this.sb.rpc('get_thread_messages', {
                p_thread_id: threadId
            });
            
            if (error) {
                // Fallback к прямому запросу
                const { data: fallbackMessages, error: fallbackError } = await this.sb
                    .from('support_messages')
                    .select('*')
                    .eq('thread_id', threadId)
                    .order('created_at', { ascending: true });
                
                if (fallbackError) throw fallbackError;
                this.processThreadMessages(threadId, fallbackMessages, threadInfo);
                return;
            }
            
            this.processThreadMessages(threadId, messages, threadInfo);
        } catch (e) {
            console.error('fetchThreadMessages error:', e);
        }
    }

    processThreadMessages(threadId, messages, threadInfo = null) {
        if (!this.questions[threadId]) {
            // Если у нас есть сообщения, попробуем получить данные пользователя из первого сообщения пользователя
            const userMessage = (messages || []).find(msg => msg.sender_role === 'user');
            
            this.questions[threadId] = {
                user: {
                    id: threadId,
                    username: threadInfo?.username || userMessage?.sender_username || 'скрыт',
                    first_name: threadInfo?.first_name || userMessage?.sender_first_name || 'Пользователь'
                },
                messages: []
            };
        }

        // Преобразуем сообщения в нужный формат
        this.questions[threadId].messages = (messages || []).map(msg => ({
            id: msg.id,
            text: msg.message_text,
            type: msg.sender_role,
            timestamp: msg.created_at,
            userId: threadId,
            username: msg.sender_username || 'скрыт'
        }));
    }

    async fetchUserMessages() {
        try {
            const myTelegramId = String(this.currentUser.id);
            
            // Загружаем сообщения для текущего пользователя
            const { data: messages, error } = await this.sb.rpc('get_thread_messages', {
                p_thread_id: myTelegramId
            });
            
            if (error) {
                // Fallback к прямому запросу
                const { data: fallbackMessages, error: fallbackError } = await this.sb
                    .from('support_messages')
                    .select('*')
                    .eq('thread_id', myTelegramId)
                    .order('created_at', { ascending: true });
                
                if (fallbackError) throw fallbackError;
                this.processUserMessages(fallbackMessages);
                return;
            }
            
            this.processUserMessages(messages);
        } catch (e) {
            console.error('fetchUserMessages error:', e);
        }
    }

    processUserMessages(messages) {
        const myTelegramId = String(this.currentUser.id);
        
        console.log('Processing user messages:', messages?.length || 0, 'messages for user', myTelegramId);
        
        this.questions[myTelegramId] = {
            user: {
                id: myTelegramId,
                username: this.currentUser.username || 'скрыт',
                first_name: this.currentUser.first_name || 'Пользователь'
            },
            messages: (messages || []).map(msg => {
                console.log('Processing message:', {
                    id: msg.id,
                    text: msg.message_text,
                    sender_role: msg.sender_role,
                    sender_telegram_id: msg.sender_telegram_id
                });
                
                return {
                    id: msg.id,
                    text: msg.message_text,
                    type: msg.sender_role,
                    timestamp: msg.created_at,
                    userId: myTelegramId,
                    username: msg.sender_username || this.currentUser.username || 'скрыт'
                };
            })
        };
        
        // Загружаем сообщения в интерфейс для пользователя
        if (!this.isAdmin && this.currentView === 'chat') {
            console.log('Loading messages to user interface');
            const messagesContainer = document.getElementById('messages');
            messagesContainer.innerHTML = '';
            this.questions[myTelegramId].messages.forEach(message => {
                console.log('Adding message to UI:', message.text, 'type:', message.type);
                this.addMessage(message);
            });
        }
    }

    subscribeRealtime() {
        if (!this.sb) return;
        try {
            // Подписка на новые сообщения в support_messages
            this.sb.channel('support_messages_realtime')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'support_messages' 
                }, (payload) => {
                    this.handleRealtimeMessage(payload.new);
                })
                .subscribe();
                
            console.log('Subscribed to realtime updates');
        } catch (e) {
            console.error('subscribeRealtime error:', e);
        }
    }

    handleRealtimeMessage(messageData) {
        try {
            const threadId = messageData.thread_id;
            const senderTelegramId = Number(messageData.sender_telegram_id);
            const myTelegramId = Number(this.currentUser.id);
            
            // Проверяем, не от нас ли это сообщение (избегаем дублирования)
            if (senderTelegramId === myTelegramId) {
                console.log('Ignoring my own message');
                return;
            }

            const msg = {
                id: messageData.id,
                text: messageData.message_text,
                type: messageData.sender_role,
                timestamp: messageData.created_at,
                userId: threadId,
                username: messageData.sender_username || 'скрыт'
            };

            console.log('Processing realtime message:', {
                threadId,
                senderTelegramId,
                senderRole: messageData.sender_role,
                isAdmin: this.isAdmin,
                myTelegramId,
                currentView: this.currentView,
                messageText: messageData.message_text
            });

            // НОВАЯ ЛОГИКА: Все сообщения группируются по thread_id (который = user_id)
            
            if (this.isAdmin) {
                // === ЛОГИКА ДЛЯ АДМИНА ===
                
                // Инициализируем тред если его нет
                if (!this.questions[threadId]) {
                    this.questions[threadId] = {
                        user: {
                            id: threadId,
                            username: messageData.sender_username || 'скрыт',
                            first_name: messageData.sender_first_name || 'Пользователь'
                        },
                        messages: []
                    };
                }

                // Добавляем сообщение в локальную структуру
                this.questions[threadId].messages.push(msg);

                // Отображаем сообщение если открыт чат с этим пользователем
                if (this.currentView === 'user-chat' && this.selectedUserId === threadId) {
                    console.log('Adding message to admin chat view');
                    this.addMessage(msg);
                }
                
                // Обновляем список пользователей в админ-панели
                if (this.currentView === 'admin-panel') {
                    this.loadUsersList();
                }
                
            } else {
                // === ЛОГИКА ДЛЯ ПОЛЬЗОВАТЕЛЯ ===
                
                const myThreadId = String(myTelegramId);
                
                // Показываем сообщения только в своем треде
                if (threadId === myThreadId) {
                    console.log('Adding message to user chat - this is for me!');
                    
                    // Инициализируем тред если его нет
                    if (!this.questions[myThreadId]) {
                        this.questions[myThreadId] = {
                            user: {
                                id: myThreadId,
                                username: this.currentUser.username || 'скрыт',
                                first_name: this.currentUser.first_name || 'Пользователь'
                            },
                            messages: []
                        };
                    }

                    // Добавляем сообщение в локальную структуру
                    this.questions[myThreadId].messages.push(msg);

                    // Отображаем сообщение если пользователь в чате
                    if (this.currentView === 'chat') {
                        console.log('Displaying admin message to user');
                        this.addMessage(msg);
                    }
                } else {
                    console.log('Message not for me, ignoring. My thread:', myThreadId, 'Message thread:', threadId);
                }
            }

            console.log('Realtime message processed successfully');
        } catch (e) {
            console.error('handleRealtimeMessage error:', e);
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
        
        // Обновляем заголовок: для пользователя показываем "Администратор ✔", для админа — общий заголовок
        document.querySelector('.chat-title').textContent = this.isAdmin ? 'Поддержка канала ФОРМУЛА' : 'Администратор ✔';
    }
    
    showUserChat(userId) {
        this.currentView = 'user-chat';
        this.selectedUserId = userId;
        this.selectedUserData = this.questions[userId];
        
        // Скрываем админ-панель и показываем чат
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        
        // Обновляем заголовок с никнеймом/именем пользователя
        const uname = this.selectedUserData.user.username;
        const nameOrNick = uname ? `@${uname}` : (this.selectedUserData.user.first_name || 'Пользователь');
        document.querySelector('.chat-title').textContent = nameOrNick;
        
        // Очищаем сообщения и загружаем сообщения выбранного пользователя
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        this.selectedUserData.messages.forEach(message => this.addMessage(message));
        
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
        // Безопасность: отвечаем только тредам с числовым telegram_id
        if (!/^\d+$/.test(String(this.selectedUserId))) {
            this.showStatus('Невозможно отправить: неизвестен Telegram ID пользователя. Откройте диалог из уведомления "Ответить".', 'error');
            return;
        }
        
        // Создаем ответ администратора
        const reply = {
            id: Date.now(),
            text: text,
            type: 'admin',
            timestamp: new Date(),
            userId: String(this.selectedUserId),
            adminId: this.currentUser.id,
            username: this.selectedUserData?.user?.username || ''
        };
        
        // Добавляем в чат
        this.addMessage(reply);
        
        // Сохраняем ответ
        this.questions[this.selectedUserId].messages.push(reply);
        
        // Отправляем уведомление пользователю через бота
        this.sendUserNotification(reply);
        // Сохраняем ответ админа в Supabase в тред пользователя
        this.saveMessageToCloud(reply);
        
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
        const isSelf = this.isAdmin ? (message.type === 'admin') : (message.type === 'user');
        const sideClass = isSelf ? 'self' : 'other';
        messageElement.className = `message ${sideClass}`;
        
        let senderName = '';
        if (message.type === 'admin') {
            // Для сообщений администратора показываем "Администратор ✔"
            senderName = '<div class="message-sender">Администратор <span class="verified-badge-small">✔</span></div>';
        } else {
            // Для сообщений пользователя показываем его Telegram ник или имя
            if (this.isAdmin && this.selectedUserData) {
                // В админ-панели показываем данные выбранного пользователя
                const uname = this.selectedUserData.user.username;
                const label = uname ? `@${uname}` : (this.selectedUserData.user.first_name || 'Пользователь');
                senderName = `<div class="message-sender">${this.escapeHtml(label)}</div>`;
            } else {
                // Для обычного пользователя показываем его данные
                const uname = message.username || this.currentUser.username || '';
                const label = uname ? `@${uname}` : (this.currentUser.first_name || 'Пользователь');
                senderName = `<div class="message-sender">${this.escapeHtml(label)}</div>`;
            }
        }
        
        messageElement.innerHTML = `
            ${senderName}
            <div class="message-text">${this.escapeHtml(message.text)}</div>
            <div class="file-attachment">
                <a href="${message.attachment.url}" target="_blank" download="${message.attachment.name}">
                    📎 ${message.attachment.name} (${this.formatFileSize(message.attachment.size)})
                </a>
            </div>
            <div class="message-time">${this.formatTime(message.timestamp)}</div>
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
    getSenderLabel(message) {
        // Для пользователя: его сообщения — label = @username или first_name; админ — "Администратор ✔"
        // Для админа: сообщения с type 'admin' — "Администратор ✔", иначе — @username пользователя
        if (message.type === 'admin') return 'Администратор ✔';
        const uname = message.username || (this.selectedUserData?.user.username) || this.currentUser.username || '';
        return uname ? `@${uname}` : ((this.selectedUserData?.user.first_name) || this.currentUser.first_name || 'Пользователь');
    }
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
