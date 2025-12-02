import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ConversationList from "../components/ConversationList";
import MessageInput from "../components/MessageInput";
import { useConversations, useMessages } from "../hooks/useSocialData";
import { useSendMessage, useMarkRead } from "../hooks/useSocialActions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageCircle, ArrowLeft, Menu } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import Header from "@/components/Header";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import ChatBubble from "@/components/chat/ChatBubble";
import VoiceMessagePlayer from "../components/VoiceMessagePlayer";

const Chat = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: markRead } = useMarkRead();
  const { data: conversations } = useConversations();

  // Get selected conversation info
  const selectedConversation = conversations?.find(c => c.id === selectedConversationId);

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
        setUser(data.user);
        setIsUserAdmin(false);
      }
    };
    fetchUser();
  }, []);

  // Handle userId param (start/open conversation with user)
  useEffect(() => {
    const initChat = async () => {
      if (userIdParam && currentUserId) {
        const { data } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user_a.eq.${currentUserId},user_b.eq.${userIdParam}),and(user_a.eq.${userIdParam},user_b.eq.${currentUserId})`)
          .single();
        
        if (data) {
          setSelectedConversationId(data.id);
        }
      }
    };
    initChat();
  }, [userIdParam, currentUserId]);

  // Mark read when opening
  useEffect(() => {
    if (selectedConversationId) {
      markRead(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Realtime Subscription
  useEffect(() => {
    if (!selectedConversationId) return;

    const channel = supabase
      .channel(`chat:${selectedConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          markRead(selectedConversationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, queryClient]);

  const { data: messages, isLoading: messagesLoading } = useMessages(selectedConversationId || "");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [messages]);

  const handleSend = (params: any) => {
    sendMessage({
      ...params,
      conversation_id: selectedConversationId || undefined,
      receiver_id: !selectedConversationId ? userIdParam || undefined : undefined
    }, {
      onSuccess: (data) => {
        if (data.conversationId && data.conversationId !== selectedConversationId) {
          setSelectedConversationId(data.conversationId);
        }
      }
    });
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setMobileMenuOpen(false);
  };

  if (!currentUserId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition>
      <Header user={user} isUserAdmin={isUserAdmin} favoritesCount={0} />
      <div className="container mx-auto px-0 md:px-4 py-0 md:py-4">
        <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] bg-background md:rounded-xl md:border md:shadow-sm overflow-hidden">
          {/* Sidebar - Desktop */}
          <div className="w-80 border-r bg-muted/5 hidden md:flex flex-col">
            <div className="p-4 border-b bg-background">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                {t('social.messages')}
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationList 
                selectedId={selectedConversationId} 
                onSelect={handleSelectConversation} 
              />
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            {selectedConversation ? (
              <div className="p-4 border-b bg-background flex items-center gap-3">
                {/* Mobile menu button */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-4 border-b">
                      <h2 className="font-semibold flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        {t('social.messages')}
                      </h2>
                    </div>
                    <ConversationList 
                      selectedId={selectedConversationId} 
                      onSelect={handleSelectConversation} 
                    />
                  </SheetContent>
                </Sheet>

                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.other_user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedConversation.other_user.full_name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">
                    {selectedConversation.other_user.full_name || selectedConversation.other_user.username}
                  </p>
                  {selectedConversation.other_user.is_online && (
                    <p className="text-xs text-green-500 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      {t('social.online') || 'Online'}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 border-b bg-background flex items-center gap-3 md:hidden">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <div className="p-4 border-b">
                      <h2 className="font-semibold flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        {t('social.messages')}
                      </h2>
                    </div>
                    <ConversationList 
                      selectedId={selectedConversationId} 
                      onSelect={handleSelectConversation} 
                    />
                  </SheetContent>
                </Sheet>
                <span className="font-semibold">{t('social.messages')}</span>
              </div>
            )}

            {/* Messages Area */}
            {selectedConversationId || userIdParam ? (
              <>
                <div className="flex-1 overflow-y-auto px-4" ref={scrollRef}>
                  <div className="py-4 space-y-4">
                    {messagesLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages?.length ? (
                      messages.map((msg) => (
                        <ChatBubble
                          key={msg.id}
                          message={{
                            id: msg.id,
                            content: msg.content,
                            content_type: msg.content_type,
                            attachment_url: msg.attachment_url,
                            audio_url: msg.audio_url,
                            created_at: msg.created_at,
                            ai_generated: msg.ai_generated,
                          }}
                          isOwnMessage={msg.sender_id === currentUserId}
                          showAvatar={false}
                          showUsername={false}
                          AudioPlayer={VoiceMessagePlayer}
                        />
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>{t('social.startConversation') || 'Envía el primer mensaje'}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="border-t bg-background">
                  <MessageInput onSend={handleSend} isLoading={isSending} />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
                <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
                <p className="text-lg font-medium mb-1">{t('social.messages')}</p>
                <p className="text-sm text-center">
                  {t('social.selectConversation') || 'Selecciona una conversación para empezar a chatear'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Chat;
