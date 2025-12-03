import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot } from 'lucide-react';
import { format, type Locale } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ChatBubbleUser {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

export interface ChatBubbleMessage {
  id: string;
  content: string;
  content_type?: 'text' | 'audio' | 'image';
  attachment_url?: string | null;
  audio_url?: string | null;
  created_at: string;
  ai_generated?: boolean;
}

interface ChatBubbleProps {
  message: ChatBubbleMessage;
  user?: ChatBubbleUser | null;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  showUsername?: boolean;
  isOptimistic?: boolean;
  locale?: Locale;
  onImageClick?: (url: string) => void;
  AudioPlayer?: React.ComponentType<{ src: string }>;
}

export default function ChatBubble({
  message,
  user,
  isOwnMessage,
  showAvatar = false,
  showUsername = false,
  isOptimistic = false,
  locale = es,
  onImageClick,
  AudioPlayer,
}: ChatBubbleProps) {
  const userName = user?.full_name || user?.username || 'Usuario';
  const userInitial = userName.charAt(0).toUpperCase();

  const handleImageClick = () => {
    if (message.attachment_url) {
      if (onImageClick) {
        onImageClick(message.attachment_url);
      } else {
        window.open(message.attachment_url, '_blank');
      }
    }
  };

  return (
    <div className={cn(
      "flex gap-2",
      isOwnMessage ? "justify-end" : "justify-start"
    )}>
      {/* Avatar (only for others when showAvatar is true) */}
      {showAvatar && !isOwnMessage && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={user?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {userInitial}
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        "max-w-[75%] space-y-1",
        isOwnMessage ? "items-end" : "items-start"
      )}>
        {/* Username (only for others when showUsername is true) */}
        {showUsername && !isOwnMessage && (
          <p className="text-xs text-muted-foreground font-medium px-1">
            {userName}
          </p>
        )}

        {/* Message bubble */}
        <div className={cn(
          "rounded-2xl px-4 py-2",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted rounded-bl-sm",
          isOptimistic && "opacity-70"
        )}>
          {/* AI Generated indicator */}
          {message.ai_generated && (
            <div className="flex items-center gap-1 text-xs font-bold mb-1 opacity-70">
              <Bot className="h-3 w-3" />
              AI Assistant
            </div>
          )}

          {/* Image attachment */}
          {message.attachment_url && (
            <div className="mb-2">
              <img
                src={message.attachment_url}
                alt="Attachment"
                className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleImageClick}
              />
            </div>
          )}

          {/* Audio message */}
          {message.content_type === 'audio' && message.audio_url && AudioPlayer ? (
            <AudioPlayer src={message.audio_url} />
          ) : message.content && message.content !== '📷 Image' && message.content !== '📷' ? (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : null}

          {/* Timestamp */}
          <p className={cn(
            "text-[10px] mt-1 text-right",
            isOwnMessage ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {format(new Date(message.created_at), 'HH:mm', { locale })}
            {isOptimistic && ' ⏳'}
          </p>
        </div>
      </div>
    </div>
  );
}

