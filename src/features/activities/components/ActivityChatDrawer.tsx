import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Users,
  Paperclip,
  X
} from 'lucide-react';
import { es, enUS, ca } from 'date-fns/locale';
import { useActivityChat, type ActivityChatMessage } from '../hooks/useActivityChat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import ChatBubble from '@/components/chat/ChatBubble';
import EmojiPickerButton from '@/components/chat/EmojiPickerButton';

interface ActivityChatDrawerProps {
  activityId: string;
  activityTitle: string;
  participantCount: number;
  currentUserId: string | null;
  isParticipant: boolean;
}

export default function ActivityChatDrawer({
  activityId,
  activityTitle,
  participantCount,
  currentUserId,
  isParticipant,
}: ActivityChatDrawerProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Optimistic messages for instant UI feedback
  const [optimisticMessages, setOptimisticMessages] = useState<ActivityChatMessage[]>([]);

  // Only fetch messages when drawer is open
  const { messages, isLoading, sendMessage, isSending } = useActivityChat(
    activityId, 
    open && isParticipant
  );

  // Combine real messages with optimistic ones
  const allMessages = [...messages, ...optimisticMessages.filter(
    om => !messages.some(m => m.id === om.id)
  )];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current && open) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [allMessages.length, open]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'ca': return ca;
      default: return enUS;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: t('activityChat.invalidFileType'),
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('activityChat.fileTooLarge'),
        variant: 'destructive',
      });
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage && !selectedImage) return;
    if (!currentUserId) return;

    // Create optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ActivityChatMessage = {
      id: optimisticId,
      content: trimmedMessage || '📷',
      content_type: selectedImage ? 'image' : 'text',
      attachment_url: imagePreview,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      user: null, // Will be filled by the actual response
    };

    // Add to optimistic messages for instant feedback
    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    setMessage('');

    try {
      let attachmentUrl: string | undefined;

      // Upload image if selected
      if (selectedImage) {
        setUploading(true);
        const fileName = `activity-chat/${activityId}/${Date.now()}_${selectedImage.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        attachmentUrl = publicUrl;
        handleRemoveImage();
        setUploading(false);
      }

      // Send the message
      sendMessage({
        content: trimmedMessage || '📷 Image',
        content_type: selectedImage ? 'image' : 'text',
        attachment_url: attachmentUrl,
      });

      // Remove optimistic message (will be replaced by real one from realtime)
      setTimeout(() => {
        setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId));
      }, 2000);
    } catch (error: any) {
      // Remove failed optimistic message
      setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId));
      setMessage(trimmedMessage); // Restore message
      setUploading(false);
      
      toast({
        title: t('activityChat.sendError'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't show button if user is not a participant
  if (!isParticipant) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageCircle className="h-4 w-4" />
          {t('activityChat.groupChat')}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            <span className="truncate">{activityTitle}</span>
          </SheetTitle>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{t('activityChat.participants', { count: participantCount })}</span>
          </div>
        </SheetHeader>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
          <div className="py-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('activityChat.noMessages')}</p>
                <p className="text-sm mt-1">{t('activityChat.startConversation')}</p>
              </div>
            ) : (
              allMessages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={{
                    id: msg.id,
                    content: msg.content,
                    content_type: msg.content_type,
                    attachment_url: msg.attachment_url,
                    created_at: msg.created_at,
                  }}
                  user={msg.user}
                  isOwnMessage={msg.user_id === currentUserId}
                  showAvatar={true}
                  showUsername={true}
                  isOptimistic={msg.id.startsWith('optimistic-')}
                  locale={getDateLocale()}
                />
              ))
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t p-4 bg-background">
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-24 rounded-lg border"
              />
              <Button
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={handleRemoveImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          
          <div className="flex gap-2">
            <EmojiPickerButton
              onEmojiSelect={handleEmojiSelect}
              disabled={isSending || uploading}
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="activity-chat-image"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => document.getElementById('activity-chat-image')?.click()}
              disabled={isSending || uploading}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            <Textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('activityChat.placeholder')}
              className="min-h-[44px] max-h-[120px] resize-none flex-1"
              disabled={isSending || uploading}
            />

            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!message.trim() && !selectedImage) || isSending || uploading}
            >
              {isSending || uploading ? (
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
