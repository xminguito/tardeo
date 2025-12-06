import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface NotificationPayload {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  activity_id: string | null;
  read: boolean;
  created_at: string;
}

interface UseRealtimeNotificationsOptions {
  userId: string | null;
  enabled?: boolean;
}

/**
 * Hook to subscribe to realtime notifications for a user.
 * Shows a toast when a new notification arrives and invalidates the notifications query.
 * 
 * @param options.userId - The user ID to subscribe to notifications for
 * @param options.enabled - Whether to enable the subscription (default: true)
 */
export function useRealtimeNotifications({ userId, enabled = true }: UseRealtimeNotificationsOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // Don't subscribe if no userId or disabled
    if (!userId || !enabled) {
      return;
    }

    // Create a unique channel name for this user
    const channelName = `realtime-notifications-${userId}`;

    // Subscribe to INSERT events on notifications table for this user
    const channel = supabase
      .channel(channelName)
      .on<NotificationPayload>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new;

          // Show a toast notification with Sonner
          toast('🔔 Nueva notificación', {
            description: newNotification.message || 'Tienes una nueva notificación',
            duration: 5000,
            action: newNotification.activity_id
              ? {
                  label: 'Ver',
                  onClick: () => {
                    window.location.href = `/actividades/${newNotification.activity_id}`;
                  },
                }
              : undefined,
          });

          // Invalidate notifications queries to refresh the UI immediately
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', userId] });
          queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount'] });
        }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) {
          console.log(`[Realtime Notifications] Channel ${channelName} status:`, status);
        }
      });

    channelRef.current = channel;

    // Cleanup: unsubscribe on unmount or when userId changes
    return () => {
      if (channelRef.current) {
        if (import.meta.env.DEV) {
          console.log(`[Realtime Notifications] Unsubscribing from channel ${channelName}`);
        }
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, enabled, queryClient]);

  return null;
}

