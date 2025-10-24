import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityRating, RatingStats } from '../types/rating.types';
import { useToast } from '@/hooks/use-toast';

export const useActivityRatings = (activityId: string) => {
  return useQuery({
    queryKey: ['activity-ratings', activityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_ratings')
        .select(`
          *,
          profiles!activity_ratings_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ratings = data as unknown as ActivityRating[];
      
      // Calculate statistics
      const stats: RatingStats = {
        averageRating: 0,
        totalRatings: ratings.length,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };

      if (ratings.length > 0) {
        const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
        stats.averageRating = sum / ratings.length;
        
        ratings.forEach(r => {
          stats.distribution[r.rating as keyof typeof stats.distribution]++;
        });
      }

      return { ratings, stats };
    },
  });
};

export const useSubmitRating = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ activityId, rating, comment }: { activityId: string; rating: number; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const { data, error } = await supabase
        .from('activity_ratings')
        .upsert({
          activity_id: activityId,
          user_id: user.id,
          rating,
          comment: comment || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['activity-ratings', variables.activityId] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      toast({
        title: '¡Valoración enviada!',
        description: 'Tu opinión ha sido registrada correctamente.',
      });
    },
    onError: (error) => {
      console.error('Error submitting rating:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar tu valoración. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    },
  });
};

export const useUserRating = (activityId: string) => {
  return useQuery({
    queryKey: ['user-rating', activityId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data, error } = await supabase
        .from('activity_ratings')
        .select('*')
        .eq('activity_id', activityId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as ActivityRating | null;
    },
  });
};
