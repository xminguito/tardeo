import { Message } from "../types";
import { cn } from "@/lib/utils";
import VoiceMessagePlayer from "./VoiceMessagePlayer";
import { Bot } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
  isOwnMessage: boolean;
}

const ChatMessage = ({ message, isOwnMessage }: ChatMessageProps) => {
  return (
    <div className={cn("flex w-full", isOwnMessage ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg p-3 mb-2",
          isOwnMessage
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted rounded-bl-none"
        )}
      >
        {message.ai_generated && (
          <div className="flex items-center gap-1 text-xs font-bold mb-1 opacity-70">
            <Bot className="h-3 w-3" />
            AI Assistant
          </div>
        )}

        {message.content_type === 'audio' && message.audio_url ? (
          <VoiceMessagePlayer src={message.audio_url} />
        ) : (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        <div className={cn("text-[10px] mt-1 text-right opacity-70", isOwnMessage ? "text-primary-foreground" : "text-muted-foreground")}>
          {format(new Date(message.created_at), 'HH:mm')}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
