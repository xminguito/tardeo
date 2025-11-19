import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Activity, ActivityFilters } from '../types/activity.types';
import { calculateDistance, geocodeLocation } from '@/lib/distance';
import { useUserLocation } from '@/hooks/useUserLocation';
export const ACTIVITIES_QUERY_KEY = ['activities'] as const;

export function useActivities(filters?: ActivityFilters) {
  const { location: userLocation } = useUserLocation();

  return useQuery({
    queryKey: [
      ...ACTIVITIES_QUERY_KEY, 
      filters, 
      userLocation?.city, 
      userLocation?.searchRadius,
      userLocation?.coordinates?.lat,
      userLocation?.coordinates?.lng
    ],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      
      // Don't filter by location here - we'll do it with coordinates below
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
      
      let activities = data as Activity[];

      // Filter by distance if we have user coordinates
      if (userLocation?.coordinates) {
        const { lat: userLat, lng: userLng } = userLocation.coordinates;
        const radiusKm = userLocation.searchRadius ?? 100;

        const activitiesWithCoords = await Promise.all(
          activities.map(async (activity) => {
            let lat = activity.latitude ?? null;
            let lng = activity.longitude ?? null;

            if (lat == null || lng == null) {
              const geo = await geocodeLocation(activity.city || activity.location);
              if (geo) {
                lat = geo.lat;
                lng = geo.lng;
              }
            }

            return { activity, lat, lng };
          })
        );

        activities = activitiesWithCoords
          .filter(({ lat, lng }) => lat != null && lng != null)
          .filter(({ lat, lng }) => {
            const distance = calculateDistance(
              userLat,
              userLng,
              lat as number,
              lng as number
            );
            return distance <= radiusKm;
          })
          .map(({ activity }) => activity);
      } else if (filters?.location) {
        // Fallback: simple city text filter
        activities = activities.filter((activity) =>
          activity.city?.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      return activities;
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
