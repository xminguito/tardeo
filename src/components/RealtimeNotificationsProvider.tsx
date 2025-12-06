import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

/**
 * Provider component that manages realtime notification subscriptions.
 * This component listens to auth state changes and subscribes to notifications
 * for the authenticated user.
 * 
 * Mount this component at a high level in your app (inside QueryClientProvider)
 * to ensure notifications work across all pages.
 */
export function RealtimeNotificationsProvider() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Use the realtime notifications hook with the current user ID
  useRealtimeNotifications({ userId, enabled: !!userId });

  // This component doesn't render anything
  return null;
}

