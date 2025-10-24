import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Activity, ActivityFilters } from '../types/activity.types';

export const ACTIVITIES_QUERY_KEY = ['activities'] as const;

export function useActivities(filters?: ActivityFilters) {
  return useQuery({
    queryKey: [...ACTIVITIES_QUERY_KEY, filters],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.location) {
        query = query.ilike('location', `%${filters.location}%`);
      }
      if (filters?.dateFrom) {
        query = query.gte('date', filters.dateFrom.toISOString());
      }
      if (filters?.dateTo) {
        query = query.lte('date', filters.dateTo.toISOString());
      }
      if (filters?.minCost !== undefined && filters?.minCost !== null) {
        query = query.gte('cost', filters.minCost);
      }
      if (filters?.maxCost !== undefined && filters?.maxCost !== null) {
        query = query.lte('cost', filters.maxCost);
      }
      if (filters?.availableOnly) {
        query = query.filter('current_participants', 'lt', 'max_participants');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Activity[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

export function useActivityReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ activityId, userId }: { activityId: string; userId: string }) => {
      const { data: activity } = await supabase
        .from('activities')
        .select('current_participants, max_participants')
        .eq('id', activityId)
        .single();

      if (!activity) throw new Error('Actividad no encontrada');
      if (activity.current_participants >= activity.max_participants) {
        throw new Error('Actividad completa');
      }

      const { data: reservation, error: reservationError } = await supabase
        .from('activity_participants')
        .insert({ activity_id: activityId, user_id: userId })
        .select()
        .single();

      if (reservationError) throw reservationError;

      const { error: updateError } = await supabase
        .from('activities')
        .update({ current_participants: activity.current_participants + 1 })
        .eq('id', activityId);

      if (updateError) throw updateError;

      await supabase.from('notifications').insert({
        user_id: userId,
        activity_id: activityId,
        type: 'reservation_confirmed',
        title: 'Reserva confirmada',
        message: 'Te has apuntado correctamente a la actividad',
      });

      return reservation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY });
    },
  });
}
