import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useUserParticipations() {
  const [participations, setParticipations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadParticipations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setParticipations(new Set());
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from('activity_participants')
        .select('activity_id')
        .eq('user_id', user.id);

      if (data) {
        setParticipations(new Set(data.map(p => p.activity_id).filter(Boolean) as string[]));
      }
      setLoading(false);
    };

    loadParticipations();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        supabase
          .from('activity_participants')
          .select('activity_id')
          .eq('user_id', session.user.id)
          .then(({ data }) => {
            if (data) {
              setParticipations(new Set(data.map(p => p.activity_id).filter(Boolean) as string[]));
            }
          });
      } else {
        setParticipations(new Set());
        setUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isParticipating = useCallback((activityId: string) => {
    return participations.has(activityId);
  }, [participations]);

  const refreshParticipations = useCallback(async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('activity_participants')
      .select('activity_id')
      .eq('user_id', userId);

    if (data) {
      setParticipations(new Set(data.map(p => p.activity_id).filter(Boolean) as string[]));
    }
  }, [userId]);

  return {
    participations,
    isParticipating,
    refreshParticipations,
    loading,
    userId
  };
}
