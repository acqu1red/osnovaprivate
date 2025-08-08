import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send } from 'lucide-react';

const ChatInput = ({ onSendMessage, onAttachFile, disabled = false }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Введите ваш вопрос..."
          className="flex-1 resize-none"
          disabled={disabled}
          maxLength={1000}
        />
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onAttachFile}
          disabled={disabled}
          className="flex-shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
      </div>
      
      <Button
        type="submit"
        disabled={!message.trim() || disabled}
        className="w-full"
      >
        <Send className="w-4 h-4 mr-2" />
        Отправить
      </Button>
    </form>
  );
};

export default ChatInput;
