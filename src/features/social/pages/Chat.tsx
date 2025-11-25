import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import ConversationList from "../components/ConversationList";
import ChatMessage from "../components/ChatMessage";
import MessageInput from "../components/MessageInput";
import { useMessages } from "../hooks/useSocialData";
import { useSendMessage, useMarkRead } from "../hooks/useSocialActions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import Header from "@/components/Header";

const Chat = () => {
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  
  const queryClient = useQueryClient();
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutate: markRead } = useMarkRead();

  // Get current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
        setUser(data.user);
        setIsUserAdmin(false); // Simplified - chat page doesn't need admin check
      }
    };
    fetchUser();
  }, []);

  // Handle userId param (start/open conversation with user)
  useEffect(() => {
    const initChat = async () => {
        if (userIdParam && currentUserId) {
             // Check if conversation exists locally or fetch
             // For simplicity, we'll let the backend handle "find or create" when sending a message,
             // but to OPEN it, we need the ID.
             // We can use a special hook or just query the conversations list.
             // Or we can call an edge function to "get or create conversation id".
             // Let's rely on the user selecting from the list OR sending a first message.
             // If userIdParam is present, we might not have a conversation ID yet.
             // We can show an empty chat and when sending, pass receiver_id.
             // But we need to know if we should show previous messages.
             
             // Quick fix: Fetch conversation ID for this user pair
             const { data } = await supabase
                .from('conversations')
                .select('id')
                .or(`and(user_a.eq.${currentUserId},user_b.eq.${userIdParam}),and(user_a.eq.${userIdParam},user_b.eq.${currentUserId})`)
                .single();
            
            if (data) {
                setSelectedConversationId(data.id);
            } else {
                // No conversation yet. We can set a "pending" state or just null and handle "new chat" UI.
                // For now, let's just set null and handle sending with receiver_id.
                // But MessageInput needs to know where to send.
                // We'll handle this by passing receiver_id to sendMessage if no conversationId.
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
        (payload) => {
          // Invalidate messages query to fetch new message
          queryClient.invalidateQueries({ queryKey: ['messages', selectedConversationId] });
          // Also invalidate conversations to update last message
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
          
          // Mark as read if we are looking at it
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
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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

  if (!currentUserId) return <div>Loading...</div>;

  return (
    <PageTransition>
      <Header user={user} isUserAdmin={isUserAdmin} favoritesCount={0} />
      <div className="flex h-[calc(100vh-12rem)] border-t">
        {/* Sidebar */}
        <div className="w-1/3 border-r bg-muted/10 hidden md:block">
          <div className="p-4 font-bold border-b">Messages</div>
          <ConversationList 
            selectedId={selectedConversationId} 
            onSelect={setSelectedConversationId} 
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col h-full">
          {selectedConversationId || userIdParam ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                {messagesLoading ? (
                  <div className="flex justify-center"><Loader2 className="animate-spin" /></div>
                ) : messages?.length ? (
                  messages.map((msg) => (
                    <ChatMessage 
                      key={msg.id} 
                      message={msg} 
                      isOwnMessage={msg.sender_id === currentUserId} 
                    />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground mt-10">
                    No messages yet. Say hello!
                  </div>
                )}
              </div>
              <MessageInput onSend={handleSend} isLoading={isSending} />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default Chat;
