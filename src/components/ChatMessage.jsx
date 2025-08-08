import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, User, Crown } from 'lucide-react';

const ChatMessage = ({ message, isAdmin = false }) => {
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={cn(
        "flex gap-3 animate-fade-in",
        isAdmin ? "justify-start" : "justify-end"
      )}
    >
      {isAdmin && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <Crown className="w-4 h-4 text-accent-foreground" />
        </div>
      )}
      
      <div
        className={cn(
          "max-w-[80%] rounded-2xl border border-border p-4 transition-all duration-300 ease-in-out hover:shadow-md hover:shadow-black/20",
          isAdmin
            ? "bg-card text-card-foreground"
            : "bg-primary text-primary-foreground"
        )}
      >
        <div className="flex items-start gap-2">
          {!isAdmin && (
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
              <User className="w-3 h-3 text-accent-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm leading-relaxed break-words">
              {message.text}
            </p>
            
            <div className="flex items-center gap-1 mt-2 opacity-60">
              <Clock className="w-3 h-3" />
              <span className="text-xs">
                {formatTime(message.timestamp)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
