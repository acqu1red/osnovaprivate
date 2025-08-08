// OSNOVA Mini App - Main Application Logic
class OSNOVAMiniApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentUser = null;
        this.isAdmin = false;
        this.selectedUserId = null;
        this.selectedUserData = null;
        this.questions = this.loadQuestions();
        this.currentView = 'chat'; // 'chat', 'admin-panel', 'user-chat'
        
        this.init();
    }
    
    init() {
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
        
        // Проверяем права администратора
        this.isAdmin = [708907063, 7365307696].includes(parseInt(this.currentUser.id));
        
        // Инициализируем интерфейс
        this.initUI();
        this.bindEvents();
        this.loadUserMessages();
        
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
        
        // Сохраняем в локальное хранилище
        this.saveMessage(message);
        
        // Отправляем в Telegram бота
        this.sendToBot(message);
        
        // Очищаем поле ввода
        input.value = '';
        
        // Показываем статус
        this.showStatus('Сообщение отправлено!', 'success');
    }
    
    addMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${message.type}`;
        
        let senderName = '';
        if (message.type === 'admin') {
            // Для сообщений администратора показываем "Администратор ✓"
            senderName = '<div class="message-sender">Администратор <span class="verified-badge-small">✓</span></div>';
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
        // Добавляем сообщение в локальное хранилище
        if (!this.questions[this.currentUser.id]) {
            this.questions[this.currentUser.id] = {
                user: {
                    id: this.currentUser.id,
                    username: this.currentUser.username,
                    first_name: this.currentUser.first_name
                },
                messages: []
            };
        }
        
        this.questions[this.currentUser.id].messages.push(message);
        this.saveQuestions();
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
        
        // Также отправляем через Telegram Bot API (если доступно)
        this.sendToTelegramAPI(botData);
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
        const adminIds = [708907063, 7365307696];
        
        adminIds.forEach(adminId => {
            // Здесь должна быть интеграция с Telegram Bot API
            // Для демонстрации используем console.log
            console.log(`Отправка администратору ${adminId}:`, message);
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
        this.saveQuestions();
        
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
        
        // Отправляем уведомление пользователю через бота
        this.sendUserMessage(reply.userId, adminName, reply.text);
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
        
        messageElement.className = `message ${message.type}`;
        
        let senderName = '';
        if (message.type === 'admin') {
            // Для сообщений администратора показываем "Администратор ✓"
            senderName = '<div class="message-sender">Администратор <span class="verified-badge-small">✓</span></div>';
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
        try {
            const stored = localStorage.getItem('osnova_questions');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Error loading questions:', e);
            return {};
        }
    }
    
    saveQuestions() {
        try {
            localStorage.setItem('osnova_questions', JSON.stringify(this.questions));
        } catch (e) {
            console.error('Error saving questions:', e);
        }
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
