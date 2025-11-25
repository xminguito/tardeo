import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Mic, Sparkles, Loader2, Paperclip, X } from "lucide-react";
import { SendMessageParams } from "../types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MessageInputProps {
  onSend: (params: SendMessageParams) => void;
  isLoading?: boolean;
}

const MessageInput = ({ onSend, isLoading }: MessageInputProps) => {
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleSend = async (type: 'text' | 'audio' | 'ai') => {
    if (!text.trim() && !selectedImage) return;

    try {
      let attachmentUrl: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        setUploading(true);
        const fileName = `${Date.now()}_${selectedImage.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from("chat-attachments")
          .upload(fileName, selectedImage, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("chat-attachments")
          .getPublicUrl(fileName);

        attachmentUrl = publicUrl;
      }

      if (type === 'ai') {
        onSend({ content: text || "Analyze this image", content_type: 'text', reply_with_ai: true, attachment_url: attachmentUrl });
      } else if (type === 'audio') {
        onSend({ content: text, content_type: 'audio', attachment_url: attachmentUrl });
      } else {
        onSend({ 
          content: text || "📷 Image", 
          content_type: selectedImage ? 'image' : 'text',
          attachment_url: attachmentUrl 
        });
      }
      
      setText("");
      handleRemoveImage();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('text');
    }
  };

  return (
    <div className="p-4 border-t bg-background">
      {imagePreview && (
        <div className="mb-2 relative inline-block">
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-h-32 rounded-lg border"
          />
          <Button
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemoveImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedImage ? "Add a caption (optional)..." : "Type a message..."}
          className="min-h-[50px] max-h-[150px] resize-none"
          disabled={isLoading || uploading}
        />
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
            id="image-upload"
          />
          <Button 
            size="icon" 
            variant="outline"
            onClick={() => document.getElementById("image-upload")?.click()}
            disabled={isLoading || uploading}
            title="Attach Image"
          >
            <Paperclip className="h-4 w-4" />
          </Button>

          <Button 
            size="icon" 
            onClick={() => handleSend('text')} 
            disabled={(!text.trim() && !selectedImage) || isLoading || uploading}
            title="Send"
          >
            {isLoading || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          
          <Button 
            size="icon" 
            variant="secondary"
            onClick={() => handleSend('audio')} 
            disabled={!text.trim() || isLoading || uploading}
            title="Send as Voice (ElevenLabs)"
          >
            <Mic className="h-4 w-4" />
          </Button>

          <Button 
            size="icon" 
            variant="outline"
            onClick={() => handleSend('ai')} 
            disabled={(!text.trim() && !selectedImage) || isLoading || uploading}
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
