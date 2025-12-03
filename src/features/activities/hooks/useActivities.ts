import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Activity, ActivityFilters, ActivityWithParticipation, ParticipantPreview } from '../types/activity.types';
import { calculateDistance, geocodeLocation } from '@/lib/distance';
import { useUserLocation } from '@/hooks/useUserLocation';
export const ACTIVITIES_QUERY_KEY = ['activities'] as const;

/**
 * Fetches participant count and preview avatars for a list of activities
 */
async function enrichActivitiesWithParticipants(
  activities: Activity[],
  currentUserId: string | null
): Promise<ActivityWithParticipation[]> {
  if (activities.length === 0) return [];

  const activityIds = activities.map(a => a.id);

  // Batch fetch all participant counts
  const { data: participantCounts, error: participantError } = await supabase
    .from('activity_participants')
    .select('activity_id, user_id')
    .in('activity_id', activityIds);

  // If RLS blocks anonymous access, participantCounts will be null/empty
  // We'll still show participant count from activities.current_participants as fallback
  const hasParticipantAccess = !participantError && participantCounts && participantCounts.length > 0;

  // Group participants by activity
  const participantsByActivity = new Map<string, string[]>();
  if (hasParticipantAccess) {
    participantCounts.forEach(p => {
      const existing = participantsByActivity.get(p.activity_id) || [];
      existing.push(p.user_id);
      participantsByActivity.set(p.activity_id, existing);
    });
  }

  // Get unique user IDs for profile fetching (max 3 per activity)
  const userIdsToFetch = new Set<string>();
  participantsByActivity.forEach((userIds) => {
    // Prioritize current user if they're participating
    const sorted = currentUserId && userIds.includes(currentUserId)
      ? [currentUserId, ...userIds.filter(id => id !== currentUserId)]
      : userIds;
    sorted.slice(0, 3).forEach(id => userIdsToFetch.add(id));
  });

  // Fetch profiles for preview
  let profilesMap = new Map<string, ParticipantPreview>();
  if (userIdsToFetch.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', Array.from(userIdsToFetch));
    
    (profiles || []).forEach(p => {
      profilesMap.set(p.id, p);
    });
  }

  // Enrich activities
  return activities.map(activity => {
    const participantUserIds = participantsByActivity.get(activity.id) || [];
    const isUserParticipating = currentUserId ? participantUserIds.includes(currentUserId) : false;
    
    // Use real count if we have access, otherwise fallback to current_participants from activities table
    const realCount = hasParticipantAccess 
      ? participantUserIds.length 
      : activity.current_participants;
    
    // Build preview list (current user first if participating)
    const sortedIds = isUserParticipating && currentUserId
      ? [currentUserId, ...participantUserIds.filter(id => id !== currentUserId)]
      : participantUserIds;
    
    const participants_preview = sortedIds
      .slice(0, 3)
      .map(id => profilesMap.get(id))
      .filter((p): p is ParticipantPreview => !!p);

    return {
      ...activity,
      isUserParticipating,
      availableSlots: activity.max_participants - realCount,
      participants_count: realCount,
      participants_preview,
    };
  });
}

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
      // Get current user for participation check
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || null;

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
      // Note: availableOnly filter is applied client-side because Supabase 
      // cannot compare two columns directly in a filter

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

      // Enrich with participant data
      let enrichedActivities = await enrichActivitiesWithParticipants(activities, currentUserId);

      // Apply availableOnly filter client-side (using real count)
      if (filters?.availableOnly) {
        enrichedActivities = enrichedActivities.filter(
          (a) => a.availableSlots > 0
        );
      }

      return enrichedActivities;
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
