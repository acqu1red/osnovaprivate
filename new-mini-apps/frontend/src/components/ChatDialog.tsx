import React, { useState, useEffect } from 'react';
import './ChatDialog.css';
import { supabase } from '../supabaseClient';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
}

const ChatDialog: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*');

      if (error) console.error('Error fetching messages:', error);
      else setMessages(data.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.is_user,
      })));
    };

    fetchMessages();
  }, []);

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: messages.length + 1,
        content: inputValue,
        isUser: true,
      };

      const { error } = await supabase
        .from('messages')
        .insert([{ content: inputValue, is_user: true }]);

      if (error) console.error('Error sending message:', error);
      else {
        setMessages([...messages, newMessage]);
        notifyAdmin(newMessage);
      }

      setInputValue('');
    }
  };

  const notifyAdmin = async (message: Message) => {
    const telegramBotToken = '8354723250:AAEWcX6OojEi_fN-RAekppNMVTAsQDU0wvo';
    const chatId = '-1001108882403';
    const text = `Новое сообщение от пользователя: ${message.content}`;

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(text)}`;

    try {
      await fetch(url);
      console.log('Уведомление отправлено администратору.');
    } catch (error) {
      console.error('Ошибка при отправке уведомления администратору:', error);
    }
  };

  return (
    <div className="chat-dialog">
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.isUser ? 'user-message' : 'admin-message'}`}
          >
            {message.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Введите сообщение..."
        />
        <button onClick={handleSendMessage}>Отправить</button>
      </div>
    </div>
  );
};

export default ChatDialog;
