// OSNOVA Mini App - Main Application Logic
class OSNOVAMiniApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.currentUser = null;
        this.isAdmin = false;
        this.selectedUserId = null;
        this.questions = this.loadQuestions();
        
        this.init();
    }
    
    init() {
        // Инициализация Telegram Web App
        this.tg.ready();
        this.tg.expand();
        this.tg.MainButton.hide();
        
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
        
        // Если админ, показываем админ-панель
        if (this.isAdmin) {
            this.showAdminPanel();
        }
    }
    
    initUI() {
        // Добавляем приветственное сообщение
        this.addMessage({
            text: `Добро пожаловать в ОСНОВА! 👋\n\nЗадайте любой вопрос о закрытом канале, и мы ответим вам в ближайшее время.`,
            type: 'admin',
            timestamp: new Date()
        });
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
        
        // Админ-панель
        if (this.isAdmin) {
            document.getElementById('back-to-chat').addEventListener('click', () => {
                this.showChat();
            });
            
            document.getElementById('admin-send-btn').addEventListener('click', () => {
                this.sendAdminReply();
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
        
        // Отправляем в Telegram канал
        this.sendToTelegramChannel(message);
        
        // Очищаем поле ввода
        input.value = '';
        
        // Показываем статус
        this.showStatus('Сообщение отправлено!', 'success');
    }
    
    addMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${message.type}`;
        messageElement.innerHTML = `
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
    
    sendToTelegramChannel(message) {
        // Формируем сообщение для канала
        const channelMessage = `❓ Новый вопрос от пользователя:
Username: @${message.username}
User ID: ${message.userId}
Сообщение: ${message.text}`;
        
        // Отправляем данные в бота через Telegram Web App
        this.tg.sendData(JSON.stringify({
            type: 'new_question',
            data: {
                message: channelMessage,
                user: {
                    id: message.userId,
                    username: message.username
                },
                question: message.text,
                timestamp: message.timestamp
            }
        }));
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
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'flex';
        this.loadUsersList();
    }
    
    showChat() {
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
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
            `;
            
            userElement.addEventListener('click', () => {
                this.selectUser(userId);
            });
            
            usersList.appendChild(userElement);
        });
    }
    
    selectUser(userId) {
        this.selectedUserId = userId;
        
        // Обновляем активный класс
        document.querySelectorAll('.user-item').forEach(item => {
            item.classList.remove('active');
        });
        event.target.closest('.user-item').classList.add('active');
        
        // Загружаем сообщения пользователя
        this.loadUserMessagesForAdmin(userId);
    }
    
    loadUserMessagesForAdmin(userId) {
        const adminMessages = document.getElementById('admin-messages');
        adminMessages.innerHTML = '';
        
        const userData = this.questions[userId];
        if (userData) {
            userData.messages.forEach(message => {
                const messageElement = document.createElement('div');
                messageElement.className = `message ${message.type}`;
                messageElement.innerHTML = `
                    <div class="message-text">${this.escapeHtml(message.text)}</div>
                    <div class="message-time">${this.formatTime(message.timestamp)}</div>
                `;
                
                adminMessages.appendChild(messageElement);
            });
            
            adminMessages.scrollTop = adminMessages.scrollHeight;
        }
    }
    
    sendAdminReply() {
        const input = document.getElementById('admin-reply');
        const text = input.value.trim();
        
        if (!text || !this.selectedUserId) return;
        
        // Создаем ответ администратора
        const reply = {
            id: Date.now(),
            text: text,
            type: 'admin',
            timestamp: new Date(),
            userId: this.selectedUserId
        };
        
        // Добавляем в админ-чат
        const adminMessages = document.getElementById('admin-messages');
        const messageElement = document.createElement('div');
        messageElement.className = 'message admin';
        messageElement.innerHTML = `
            <div class="message-text">${this.escapeHtml(text)}</div>
            <div class="message-time">${this.formatTime(reply.timestamp)}</div>
        `;
        
        adminMessages.appendChild(messageElement);
        adminMessages.scrollTop = adminMessages.scrollHeight;
        
        // Сохраняем ответ
        this.questions[this.selectedUserId].messages.push(reply);
        this.saveQuestions();
        
        // Отправляем уведомление пользователю через бота
        this.tg.sendData(JSON.stringify({
            type: 'admin_reply',
            data: {
                userId: this.selectedUserId,
                message: text,
                adminId: this.currentUser.id
            }
        }));
        
        // Очищаем поле ввода
        input.value = '';
        
        // Показываем статус
        this.showStatus('Ответ отправлен!', 'success');
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
        
        // Отправляем в канал
        this.sendToTelegramChannel(message);
    }
    
    addMessageWithAttachment(message) {
        const messagesContainer = document.getElementById('messages');
        const messageElement = document.createElement('div');
        
        messageElement.className = `message ${message.type}`;
        messageElement.innerHTML = `
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
    new OSNOVAMiniApp();
});
