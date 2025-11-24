import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Sparkles, Loader2 } from "lucide-react";
import { SendMessageParams } from "../types";

interface MessageInputProps {
  onSend: (params: SendMessageParams) => void;
  isLoading?: boolean;
}

const MessageInput = ({ onSend, isLoading }: MessageInputProps) => {
  const [text, setText] = useState("");

  const handleSend = (type: 'text' | 'audio' | 'ai') => {
    if (!text.trim()) return;

    if (type === 'ai') {
        onSend({ content: text, content_type: 'text', reply_with_ai: true });
    } else if (type === 'audio') {
        onSend({ content: text, content_type: 'audio' });
    } else {
        onSend({ content: text, content_type: 'text' });
    }
    
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('text');
    }
  };

  return (
    <div className="p-4 border-t bg-background">
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[50px] max-h-[150px] resize-none"
          disabled={isLoading}
        />
        <div className="flex flex-col gap-2">
            <Button 
                size="icon" 
                onClick={() => handleSend('text')} 
                disabled={!text.trim() || isLoading}
                title="Send Text"
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            
            <Button 
                size="icon" 
                variant="secondary"
                onClick={() => handleSend('audio')} 
                disabled={!text.trim() || isLoading}
                title="Send as Voice (ElevenLabs)"
            >
                <Mic className="h-4 w-4" />
            </Button>

            <Button 
                size="icon" 
                variant="outline"
                onClick={() => handleSend('ai')} 
                disabled={!text.trim() || isLoading}
                title="Ask AI"
                className="text-purple-500 hover:text-purple-600"
            >
                <Sparkles className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
