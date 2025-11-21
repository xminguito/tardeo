import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Bot, X } from "lucide-react";
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
}

const ConversationHistory = ({ messages, isVisible, onClose }: ConversationHistoryProps) => {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!isVisible || messages.length === 0) return null;

  return (
    <Card className="fixed bottom-32 right-8 z-40 w-96 h-[500px] flex flex-col shadow-2xl">
      <div className="p-4 border-b bg-primary/5 flex items-center justify-between">
        <h3 className="font-semibold text-sm">{t('voice.conversationHistory')}</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        )}
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
          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </Card>
  );
};

export default ConversationHistory;
