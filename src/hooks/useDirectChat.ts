import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  last_message: string | null;
  last_message_at: string;
  unread_count_a: number;
  unread_count_b: number;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  content_type: string;
  read_at: string | null;
  created_at: string;
}

interface UseDirectChatReturn {
  conversationId: string | null;
  messages: Message[];
  loading: boolean;
  sending: boolean;
  sendMessage: (content: string) => Promise<void>;
  markAsRead: () => Promise<void>;
}

export function useDirectChat(otherUserId: string | null): UseDirectChatReturn {
  const { toast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Get or create conversation
  useEffect(() => {
    if (!currentUserId || !otherUserId) {
      setLoading(false);
      return;
    }

    const getOrCreateConversation = async () => {
      setLoading(true);
      try {
        // Try to find existing conversation (checking both orderings)
        const { data: existingConv, error: findError } = await supabase
          .from('conversations')
          .select('*')
          .or(
            `and(user_a.eq.${currentUserId},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${currentUserId})`
          )
          .maybeSingle();

        if (findError) throw findError;

        if (existingConv) {
          setConversationId(existingConv.id);
          return;
        }

        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            user_a: currentUserId,
            user_b: otherUserId,
            last_message_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        
        setConversationId(newConv.id);
      } catch (error) {
        console.error('Error getting/creating conversation:', error);
        toast({
          title: 'Error',
          description: 'No se pudo iniciar la conversación',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    getOrCreateConversation();
  }, [currentUserId, otherUserId, toast]);

  // Load messages and subscribe to realtime
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      setMessages(data || []);
    };

    loadMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id ? (payload.new as Message) : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !currentUserId || !otherUserId || !content.trim()) return;

    setSending(true);
    try {
      // Insert message
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: content.trim(),
          content_type: 'text',
        });

      if (msgError) throw msgError;

      // Update conversation's last message
      const { error: convError } = await supabase
        .from('conversations')
        .update({
          last_message: content.trim().substring(0, 100),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      if (convError) throw convError;

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }, [conversationId, currentUserId, otherUserId, toast]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!conversationId || !currentUserId) return;

    try {
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', currentUserId)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, currentUserId]);

  return {
    conversationId,
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
  };
}
