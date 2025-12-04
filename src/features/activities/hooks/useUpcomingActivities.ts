import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Activity } from '../types/activity.types';

export interface UpcomingActivity extends Activity {
  daysUntil: number;
  isToday: boolean;
  isTomorrow: boolean;
}

/**
 * Gets today's date in YYYY-MM-DD format in local timezone
 * This fixes the UTC vs local timezone comparison issue
 */
function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Fetches the current user's upcoming joined activities
 * sorted by date ascending (next activity first)
 */
export function useUpcomingActivities() {
  return useQuery({
    queryKey: ['upcoming-activities'],
    queryFn: async (): Promise<UpcomingActivity[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[useUpcomingActivities] No user logged in');
        return [];
      }

      // Get activity IDs the user has joined
      const { data: participations, error: partError } = await supabase
        .from('activity_participants')
        .select('activity_id')
        .eq('user_id', user.id);

      if (partError) {
        console.error('[useUpcomingActivities] Error fetching participations:', partError);
        return [];
      }

      if (!participations || participations.length === 0) {
        console.log('[useUpcomingActivities] User has no joined activities');
        return [];
      }

      const activityIds = participations
        .map(p => p.activity_id)
        .filter(Boolean) as string[];

      console.log('[useUpcomingActivities] User joined activity IDs:', activityIds);

      // Get today's date in local timezone (YYYY-MM-DD format)
      // This fixes the issue where UTC conversion could exclude today's events
      const todayStr = getLocalDateString();
      console.log('[useUpcomingActivities] Filtering activities >= ', todayStr);

      const { data: activities, error: actError } = await supabase
        .from('activities')
        .select('*')
        .in('id', activityIds)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (actError) {
        console.error('[useUpcomingActivities] Error fetching activities:', actError);
        return [];
      }

      if (!activities || activities.length === 0) {
        console.log('[useUpcomingActivities] No upcoming activities found');
        return [];
      }

      console.log('[useUpcomingActivities] Found upcoming activities:', activities.length);

      // Enrich with countdown info using local dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const enrichedActivities = activities
        .filter(activity => {
          // Safety check: ensure date and time exist
          if (!activity.date || !activity.time) {
            console.warn('[useUpcomingActivities] Activity missing date/time:', activity.id);
            return false;
          }
          return true;
        })
        .map(activity => {
          // Parse date safely - handle both "YYYY-MM-DD" and ISO formats
          const dateParts = activity.date.split('T')[0].split('-');
          const activityDate = new Date(
            parseInt(dateParts[0]),
            parseInt(dateParts[1]) - 1,
            parseInt(dateParts[2])
          );
          activityDate.setHours(0, 0, 0, 0);
          
          const diffTime = activityDate.getTime() - today.getTime();
          const daysUntil = Math.round(diffTime / (1000 * 60 * 60 * 24));

          return {
            ...activity,
            daysUntil,
            isToday: daysUntil === 0,
            isTomorrow: daysUntil === 1,
          } as UpcomingActivity;
        })
        // Filter out activities that are today but already past (by time)
        .filter(activity => {
          if (activity.isToday && activity.time) {
            const [hours, minutes] = activity.time.split(':').map(Number);
            const now = new Date();
            const activityTime = new Date();
            activityTime.setHours(hours, minutes, 0, 0);
            
            // Keep if activity hasn't started yet, or started within last 2 hours
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            return activityTime >= twoHoursAgo;
          }
          return true;
        });

      console.log('[useUpcomingActivities] Enriched activities:', enrichedActivities.length);
      return enrichedActivities;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10,
  });
}

/**
 * Returns the next upcoming activity and all upcoming activities for carousel
 */
export function useNextActivity() {
  const { data: upcomingActivities, isLoading, error } = useUpcomingActivities();
  
  return {
    nextActivity: upcomingActivities?.[0] ?? null,
    upcomingActivities: upcomingActivities ?? [],
    upcomingCount: upcomingActivities?.length ?? 0,
    isLoading,
    error,
  };
}

