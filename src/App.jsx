import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Shield, MessageSquare, Users } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import AdminPanel from './components/AdminPanel';
import './index.css';

const OSNOVAMiniApp = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const adminIds = [708907063, 7365307696];

  useEffect(() => {
    // Initialize Telegram Web App
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      tg.MainButton.hide();

      // Get user data
      const user = {
        id: tg.initDataUnsafe?.user?.id || 'unknown',
        username: tg.initDataUnsafe?.user?.username || 'unknown',
        first_name: tg.initDataUnsafe?.user?.first_name || 'User'
      };

      setCurrentUser(user);
      setIsAdmin(adminIds.includes(parseInt(user.id)));

      // Load existing messages from localStorage
      loadMessages();
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = () => {
    try {
      const stored = localStorage.getItem('osnova_messages');
      if (stored) {
        const parsed = JSON.parse(stored);
        setMessages(parsed.messages || []);
        setUsers(parsed.users || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const saveMessages = (newMessages, newUsers) => {
    try {
      localStorage.setItem('osnova_messages', JSON.stringify({
        messages: newMessages,
        users: newUsers
      }));
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (text) => {
    if (!text.trim() || !currentUser) return;

    const newMessage = {
      id: Date.now(),
      text: text.trim(),
      type: 'user',
      timestamp: new Date(),
      userId: currentUser.id,
      username: currentUser.username
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);

    // Update users list
    const existingUserIndex = users.findIndex(u => u.id === currentUser.id);
    const updatedUsers = [...users];
    
    if (existingUserIndex >= 0) {
      updatedUsers[existingUserIndex].messages = [
        ...(updatedUsers[existingUserIndex].messages || []),
        newMessage
      ];
    } else {
      updatedUsers.push({
        id: currentUser.id,
        username: currentUser.username,
        first_name: currentUser.first_name,
        messages: [newMessage]
      });
    }

    setUsers(updatedUsers);
    saveMessages(updatedMessages, updatedUsers);

    // Send to Telegram bot
    sendToTelegram(newMessage);
  };

  const handleAttachFile = () => {
    // Create file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*,audio/*,application/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const fileUrl = URL.createObjectURL(file);
        const message = {
          id: Date.now(),
          text: `📎 ${file.name}`,
          type: 'user',
          timestamp: new Date(),
          userId: currentUser.id,
          username: currentUser.username,
          attachment: {
            name: file.name,
            size: file.size,
            type: file.type,
            url: fileUrl
          }
        };

        const updatedMessages = [...messages, message];
        setMessages(updatedMessages);
        saveMessages(updatedMessages, users);
        sendToTelegram(message);
      }
    };

    input.click();
  };

  const sendToTelegram = (message) => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Send data to bot
      tg.sendData(JSON.stringify({
        type: 'new_question',
        data: {
          message: `❓ Новый запрос от пользователя:\nUsername: @${message.username || 'скрыт'}\nUser ID: ${message.userId}\nСообщение: ${message.text}`,
          user: {
            id: message.userId,
            username: message.username
          },
          question: message.text,
          timestamp: message.timestamp
        }
      }));
    }
  };

  const handleSendReply = (userId, text) => {
    const replyMessage = {
      id: Date.now(),
      text: text,
      type: 'admin',
      timestamp: new Date(),
      userId: userId,
      adminId: currentUser.id
    };

    // Add to messages
    const updatedMessages = [...messages, replyMessage];
    setMessages(updatedMessages);

    // Update user's messages
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          messages: [...(user.messages || []), replyMessage]
        };
      }
      return user;
    });

    setUsers(updatedUsers);
    saveMessages(updatedMessages, updatedUsers);

    // Send to Telegram bot
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.sendData(JSON.stringify({
        type: 'admin_reply',
        data: {
          userId: userId,
          message: text,
          adminId: currentUser.id
        }
      }));
    }
  };

  const welcomeMessage = {
    id: 0,
    text: `Добро пожаловать в ОСНОВА! 👋\n\nЗадайте любой вопрос о закрытом канале, и мы ответим вам в ближайшее время.`,
    type: 'admin',
    timestamp: new Date()
  };

  return (
    <div className="telegram-app">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
                <Shield className="w-8 h-8 text-accent-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">ОСНОВА: доступ к системе</CardTitle>
            <p className="text-muted-foreground">
              Доступ к закрытому каналу с техникой OSNOVA
            </p>
          </CardHeader>
        </Card>

        {/* Admin Button */}
        {isAdmin && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <Button
                onClick={() => setShowAdminPanel(true)}
                className="w-full"
                variant="outline"
              >
                <Crown className="w-4 h-4 mr-2" />
                Панель администратора
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        {!showAdminPanel ? (
          <div className="space-y-6">
            {/* Messages */}
            <Card className="flex-1 min-h-[60vh]">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <CardTitle className="text-lg">Чат</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                  {/* Welcome message */}
                  <ChatMessage message={welcomeMessage} isAdmin={true} />
                  
                  {/* User messages */}
                  {messages.map((message) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isAdmin={message.type === 'admin'}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>

            {/* Input */}
            <Card>
              <CardContent className="p-4">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onAttachFile={handleAttachFile}
                  disabled={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        ) : (
          <AdminPanel
            users={users}
            onSendReply={handleSendReply}
            onBack={() => setShowAdminPanel(false)}
          />
        )}
      </div>
    </div>
  );
};

export default OSNOVAMiniApp;
