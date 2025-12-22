import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Bot, X, Send, Loader2, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ConversationHistoryProps {
  messages: Message[];
  isVisible: boolean;
  onClose?: () => void;
  onSendTextMessage?: (text: string) => void;
  isTextMessageLoading?: boolean;
  onClearHistory?: () => void;
}

const ConversationHistory = ({ messages, isVisible, onClose, onSendTextMessage, isTextMessageLoading, onClearHistory }: ConversationHistoryProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [textInput, setTextInput] = useState("");

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendText = () => {
    if (textInput.trim() && onSendTextMessage) {
      onSendTextMessage(textInput.trim());
      setTextInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="fixed bottom-32 right-8 z-40 w-96 h-[500px] flex flex-col shadow-2xl">
      <div className="p-4 border-b bg-primary/5 flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t('voice.conversationHistory')}</h3>
        <div className="flex items-center gap-1">
          {onClearHistory && messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClearHistory} 
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              title={t('voice.clearHistory', 'Borrar historial')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`rounded-lg px-4 py-2 max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          
          {/* Loader mientras el asistente está pensando */}
          {isTextMessageLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-lg px-4 py-3 bg-muted flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">{t('voice.thinking', 'Pensando...')}</p>
              </div>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
      
      {onSendTextMessage && (
        <div className="p-4 border-t bg-background/50 flex gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('voice.typeMessage', 'Escribe un mensaje...')}
            disabled={isTextMessageLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendText}
            disabled={!textInput.trim() || isTextMessageLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ConversationHistory;
