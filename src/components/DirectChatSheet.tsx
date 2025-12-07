import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDirectChat } from '@/hooks/useDirectChat';
import { supabase } from '@/integrations/supabase/client';
import { Send, Loader2, MessageCircle } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface UserInfo {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface DirectChatSheetProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: UserInfo | null;
}

export default function DirectChatSheet({
  isOpen,
  onClose,
  otherUser,
}: DirectChatSheetProps) {
  const { t, i18n } = useTranslation();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    conversationId,
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
  } = useDirectChat(isOpen ? otherUser?.id || null : null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (isOpen && conversationId) {
      markAsRead();
    }
  }, [isOpen, conversationId, markAsRead]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;
    const content = messageInput;
    setMessageInput('');
    await sendMessage(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const locale = i18n.language === 'es' ? es : enUS;
    
    if (isToday(date)) {
      return format(date, 'HH:mm', { locale });
    } else if (isYesterday(date)) {
      return `${t('directChat.yesterday')} ${format(date, 'HH:mm', { locale })}`;
    }
    return format(date, 'd MMM HH:mm', { locale });
  };

  const getInitials = (user: UserInfo | null) => {
    if (!user) return '?';
    if (user.full_name) return user.full_name.charAt(0).toUpperCase();
    if (user.username) return user.username.charAt(0).toUpperCase();
    return 'U';
  };

  const getDisplayName = (user: UserInfo | null) => {
    if (!user) return t('directChat.unknown');
    return user.full_name || user.username || t('directChat.anonymous');
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="p-4 border-b bg-muted/30">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src={otherUser?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(otherUser)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start">
              <span className="font-semibold">{getDisplayName(otherUser)}</span>
              {otherUser?.username && (
                <span className="text-sm font-normal text-muted-foreground">
                  @{otherUser.username}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground text-sm">
                {t('directChat.startConversation')}
              </p>
              <p className="text-muted-foreground/60 text-xs mt-1">
                {t('directChat.sendFirstMessage', { name: getDisplayName(otherUser) })}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => {
                const isOwn = message.sender_id === currentUserId;
                const showTimestamp = index === 0 || 
                  new Date(message.created_at).getTime() - 
                  new Date(messages[index - 1].created_at).getTime() > 300000; // 5 min gap

                return (
                  <div key={message.id}>
                    {showTimestamp && (
                      <div className="flex justify-center my-3">
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                          {formatMessageTime(message.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'flex',
                        isOwn ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'max-w-[80%] px-4 py-2 rounded-2xl',
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-md'
                            : 'bg-muted rounded-bl-md'
                        )}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        {!showTimestamp && (
                          <p
                            className={cn(
                              'text-[10px] mt-1',
                              isOwn
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {format(new Date(message.created_at), 'HH:mm')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('directChat.typeMessage')}
              disabled={loading || sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!messageInput.trim() || loading || sending}
              size="icon"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
