import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { ArrowLeft, Crown, Users, MessageSquare, Send } from 'lucide-react';
import ChatMessage from './ChatMessage';

const AdminPanel = ({ users, onSendReply, onBack }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [replyText, setReplyText] = useState('');

  const handleSendReply = () => {
    if (replyText.trim() && selectedUser) {
      onSendReply(selectedUser.id, replyText.trim());
      setReplyText('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendReply();
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-accent" />
              <CardTitle className="text-xl">Панель администратора</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Users List */}
        <Card className="w-1/3">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <CardTitle className="text-lg">Пользователи</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 cursor-pointer transition-all duration-300 ease-in-out hover:bg-accent/10 ${
                    selectedUser?.id === user.id ? 'bg-accent/20 border-l-2 border-accent' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="font-medium text-foreground">
                    {user.first_name || user.username || 'Пользователь'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    @{user.username || 'скрыт'} • {user.messages?.length || 0} сообщений
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <CardTitle className="text-lg">
                {selectedUser ? (
                  <>
                    Чат с {selectedUser.first_name || selectedUser.username || 'пользователем'}
                  </>
                ) : (
                  'Выберите пользователя'
                )}
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {selectedUser ? (
              <>
                {/* Messages */}
                <div className="flex-1 p-4 space-y-4 max-h-[50vh] overflow-y-auto">
                  {selectedUser.messages?.map((message, index) => (
                    <ChatMessage
                      key={index}
                      message={message}
                      isAdmin={message.type === 'admin'}
                    />
                  ))}
                </div>

                {/* Reply Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-3">
                    <Textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Введите ответ..."
                      className="flex-1 resize-none"
                      maxLength={1000}
                    />
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      size="icon"
                      className="flex-shrink-0"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Выберите пользователя для просмотра сообщений
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminPanel;
