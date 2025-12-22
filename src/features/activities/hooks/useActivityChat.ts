import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ActivityChatMessage {
  id: string;
  content: string;
  content_type: 'text' | 'audio' | 'image';
  attachment_url?: string | null;
  created_at: string;
  user_id: string;
  user: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface SendMessageParams {
  content: string;
  content_type?: 'text' | 'audio' | 'image';
  attachment_url?: string;
}

// Hook to fetch activity chat messages
export function useActivityMessages(activityId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['activity-chat', activityId],
    queryFn: async (): Promise<ActivityChatMessage[]> => {
      if (!activityId) return [];

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activity-chat-messages?activity_id=${activityId}&limit=50`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch messages');
      }
      
      const data = await response.json();
      return data?.messages || [];
    },
    enabled: enabled && !!activityId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: false, // We use realtime instead
  });
}

// Hook to send activity chat messages
export function useSendActivityMessage(activityId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: SendMessageParams) => {
      if (!activityId) throw new Error('Activity ID is required');

      const { data, error } = await supabase.functions.invoke('activity-chat-send', {
        body: {
          activity_id: activityId,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Add the new message to the cache optimistically
      queryClient.setQueryData(['activity-chat', activityId], (old: ActivityChatMessage[] = []) => {
        // Check if message already exists (avoid duplicates from realtime)
        if (old.some(m => m.id === data.message.id)) {
          return old;
        }
        return [...old, data.message];
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error al enviar mensaje',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to manage realtime subscription for activity chat
export function useActivityChatRealtime(activityId: string | null, enabled: boolean = true) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!activityId || !enabled) return;

    // Create realtime channel for this activity's chat
    const channel = supabase
      .channel(`activity-chat:${activityId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_messages',
          filter: `activity_id=eq.${activityId}`,
        },
        async (payload) => {
          // Fetch the user profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newMessage: ActivityChatMessage = {
            id: payload.new.id,
            content: payload.new.content,
            content_type: payload.new.content_type,
            attachment_url: payload.new.attachment_url,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            user: profile,
          };

          // Add to cache if not already there
          queryClient.setQueryData(['activity-chat', activityId], (old: ActivityChatMessage[] = []) => {
            if (old.some(m => m.id === newMessage.id)) {
              return old;
            }
            return [...old, newMessage];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activityId, enabled, queryClient]);
}

// Combined hook for easy usage
export function useActivityChat(activityId: string | null, enabled: boolean = true) {
  const messagesQuery = useActivityMessages(activityId, enabled);
  const sendMutation = useSendActivityMessage(activityId);
  
  // Setup realtime subscription
  useActivityChatRealtime(activityId, enabled);

  return {
    messages: messagesQuery.data || [],
    isLoading: messagesQuery.isLoading,
    error: messagesQuery.error,
    sendMessage: sendMutation.mutate,
    isSending: sendMutation.isPending,
    refetch: messagesQuery.refetch,
  };
}

