import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { generateActivitySlug } from '@/lib/utils';
import { truncateList, summarizeActivity } from '@/lib/tts/voiceResponseHelper';
import { VoiceMetricsTracker } from '@/lib/tts/voiceMetricsTracker';
import type {
  VoiceToolsMap,
  SearchActivitiesParams,
  ReserveActivityParams,
  GetActivityDetailsParams,
  SuggestActivitiesParams,
  NavigateToActivitiesParams,
  SetFilterParams,
  SubmitRatingParams,
  GetRatingsParams,
} from '../types/voiceTools.types';
import type { ActivityFilters } from '../types/activity.types';

/**
 * TTS-optimized Voice Activity Tools
 * - Uses i18n translations for all responses
 * - Truncates lists to max 3 items
 * - Removes verbose explanations
 * - Maintains consistent brevity
 */

export function useVoiceActivityTools(
  onFiltersChange: (filters: ActivityFilters) => void,
  currentFilters: ActivityFilters,
  navigate?: (path: string) => void
): VoiceToolsMap {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'en' | 'es' | 'ca' | 'fr' | 'it' | 'de';

  const searchActivities = useCallback(
    async (params: SearchActivitiesParams = {} as any): Promise<string> => {
      try {
        const queryText = params.category?.trim();
        const isSimpleTitleQuery = !!queryText && !params.dateFrom && !params.dateTo && !params.location && params.maxCost === undefined;

          if (isSimpleTitleQuery) {
          const { data: matches, error: titleError } = await supabase
            .from('activities')
            .select('*')
            .ilike('title', `%${queryText}%`)
            .order('date', { ascending: true });

          if (titleError) throw titleError;

          if (!matches || matches.length === 0) {
            if (navigate) navigate('/actividades');
            const response = t('voice.search.notFound', { query: queryText });
            VoiceMetricsTracker.trackQuick('searchActivities', response, i18n.language);
            return response;
          }

          const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
          const exact = matches.find(a => normalize(a.title) === normalize(queryText));
          const chosen = exact || matches[0];

          if (navigate && chosen) {
            const slug = generateActivitySlug(chosen.title, chosen.id);
            navigate(`/actividades/${slug}`);
          }

          if (matches.length > 1 && !exact) {
            const response = t('voice.search.multiple', { count: matches.length, title: chosen.title });
            VoiceMetricsTracker.trackQuick('searchActivities', response, i18n.language);
            return response;
          }

          // Brief activity summary
          const summary = summarizeActivity(chosen, lang);
          const response = `${t('voice.search.foundOne', { title: chosen.title })}. ${summary}`;
          VoiceMetricsTracker.trackQuick('searchActivities', response, i18n.language);
          return response;
        }

        // Search with filters
        const filters: ActivityFilters = {
          category: params.category || null,
          location: params.location || null,
          dateFrom: params.dateFrom ? new Date(params.dateFrom) : null,
          dateTo: params.dateTo ? new Date(params.dateTo) : null,
          maxCost: params.maxCost ?? null,
          availableOnly: params.availableOnly || false,
        };

        onFiltersChange(filters);

        let query = supabase
          .from('activities')
          .select('*')
          .order('date', { ascending: true });

        if (filters.category) query = query.ilike('title', `%${filters.category}%`);
        if (filters.location) query = query.ilike('location', `%${filters.location}%`);
        if (filters.dateFrom) query = query.gte('date', filters.dateFrom.toISOString());
        if (filters.dateTo) query = query.lte('date', filters.dateTo.toISOString());
        if (filters.maxCost !== null) query = query.lte('cost', filters.maxCost);

        const { data: activities, error } = await query;
        if (error) throw error;

        const filtered = filters.availableOnly
          ? (activities || []).filter((a: any) => (a.current_participants ?? 0) < (a.max_participants ?? 0))
          : activities;

        const count = filtered?.length || 0;
        if (navigate) navigate('/actividades');
        
        const response = t('voice.search.found', { count });
        
        // Track metrics
        VoiceMetricsTracker.trackQuick('searchActivities', response, i18n.language);
        
        return response;
      } catch (error) {
        console.error('[Voice Tool] Error in searchActivities:', error);
        if (navigate) navigate('/actividades');
        return t('voice.search.error');
      }
    },
    [onFiltersChange, navigate, t, lang]
  );

  const reserveActivity = useCallback(
    async (params: ReserveActivityParams): Promise<string> => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return t('voice.reservation.loginRequired');
        }

        const { data: activity, error: activityError } = await supabase
          .from('activities')
          .select('current_participants, max_participants, title')
          .eq('id', params.activityId)
          .single();

        if (activityError || !activity) {
          return t('voice.details.notFound');
        }

        if (activity.current_participants >= activity.max_participants) {
          return t('voice.reservation.full', { title: activity.title });
        }

        const { data: existingReservation } = await supabase
          .from('activity_participants')
          .select('*')
          .eq('activity_id', params.activityId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingReservation) {
          return t('voice.reservation.alreadyBooked');
        }

        const { error: reservationError } = await supabase
          .from('activity_participants')
          .insert({ activity_id: params.activityId, user_id: user.id });

        if (reservationError) throw reservationError;

        await supabase
          .from('activities')
          .update({ current_participants: activity.current_participants + 1 })
          .eq('id', params.activityId);

        await supabase.from('notifications').insert({
          user_id: user.id,
          activity_id: params.activityId,
          type: 'reservation_confirmed',
          title: t('activities.reservation.success'),
          message: t('voice.reservation.success', { title: activity.title }),
        });

        queryClient.invalidateQueries({ queryKey: ['activities'] });

        toast({
          title: t('activities.reservation.success'),
          description: t('voice.reservation.success', { title: activity.title }),
        });

        const response = t('voice.reservation.success', { title: activity.title });
        VoiceMetricsTracker.trackQuick('reserveActivity', response, i18n.language);
        
        return response;
      } catch (error) {
        console.error('[Voice Tool] Error in reserveActivity:', error);
        return t('voice.reservation.error');
      }
    },
    [queryClient, toast, t]
  );

  const getActivityDetails = useCallback(
    async (params: GetActivityDetailsParams = {} as any): Promise<string> => {
      try {
        let query = supabase.from('activities').select('*');
        
        if (params.activityId) {
          query = query.eq('id', params.activityId);
        } else if (params.activityTitle) {
          query = query.ilike('title', `%${params.activityTitle}%`);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('[Voice Tool] Error querying activity:', error);
          return t('voice.details.error');
        }

        if (!data) {
          if (navigate) {
            navigate('/actividades');
          }
          return t('voice.details.notFound');
        }

        const activity = data;
        const availableSlots = activity.max_participants - activity.current_participants;
        const costText = activity.cost === 0 
          ? t('voice.common.free') 
          : `${activity.cost}€`;
        const availabilityText = availableSlots > 0
          ? t('voice.common.available', { count: availableSlots })
          : t('voice.common.full');

        if (navigate) {
          const slug = generateActivitySlug(activity.title, activity.id);
          navigate(`/actividades/${slug}`);
        }

        const date = new Date(activity.date).toLocaleDateString(
          lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : `${lang}-${lang.toUpperCase()}`
        );

        return t('voice.details.summary', {
          title: activity.title,
          date,
          time: activity.time,
          cost: costText,
          availability: availabilityText,
        });
      } catch (error) {
        console.error('[Voice Tool] Error in getActivityDetails:', error);
        return t('voice.details.error');
      }
    },
    [navigate, t, lang]
  );

  const suggestActivities = useCallback(
    async (params: SuggestActivitiesParams): Promise<string> => {
      try {
        let query = supabase
          .from('activities')
          .select('*')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(20);

        if (params.budget) {
          query = query.lte('cost', params.budget);
        }

        if (params.date) {
          const targetDate = new Date(params.date);
          const nextDay = new Date(targetDate);
          nextDay.setDate(nextDay.getDate() + 1);
          query = query.gte('date', targetDate.toISOString()).lt('date', nextDay.toISOString());
        }

        const { data: activities, error } = await query;
        if (error) throw error;

        const available = (activities || []).filter((a: any) => (a.current_participants ?? 0) < (a.max_participants ?? 0));

        if (available.length === 0) {
          return t('voice.suggestions.none');
        }

        // Truncate to max 3 activities for voice
        const { text, count } = truncateList(
          available,
          (act, idx) => summarizeActivity(act, lang),
          3
        );

        return `${t('voice.suggestions.found', { count })}. ${text}`;
      } catch (error) {
        console.error('[Voice Tool] Error in suggestActivities:', error);
        return t('voice.suggestions.error');
      }
    },
    [t, lang]
  );

  const setFilter = useCallback(
    async (params: SetFilterParams): Promise<string> => {
      try {
        const updatedFilters = { ...currentFilters };

        switch (params.filterType) {
          case 'category':
            updatedFilters.category = params.value as string;
            break;
          case 'location':
            updatedFilters.location = params.value as string;
            break;
          case 'cost':
            updatedFilters.maxCost = params.value as number;
            break;
          case 'availability':
            updatedFilters.availableOnly = params.value as boolean;
            break;
          case 'date':
            updatedFilters.dateFrom = new Date(params.value as string);
            break;
        }

        onFiltersChange(updatedFilters);
        return t('voice.filters.applied');
      } catch (error) {
        console.error('[Voice Tool] Error in setFilter:', error);
        return t('voice.filters.error');
      }
    },
    [currentFilters, onFiltersChange, t]
  );

  const clearFilters = useCallback(async (): Promise<string> => {
    try {
      onFiltersChange({});
      return t('voice.filters.cleared');
    } catch (error) {
      console.error('[Voice Tool] Error in clearFilters:', error);
      return t('voice.filters.error');
    }
  }, [onFiltersChange, t]);

  const getMyReservations = useCallback(async (): Promise<string> => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return t('voice.reservation.loginRequired');
      }

      const { data: reservations, error } = await supabase
        .from('activity_participants')
        .select('*, activities(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!reservations || reservations.length === 0) {
        return t('voice.myReservations.none');
      }

      // Truncate to max 3 reservations for voice
      const { text, count } = truncateList(
        reservations,
        (res, idx) => {
          const date = new Date(res.activities.date).toLocaleDateString(
            lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : `${lang}-${lang.toUpperCase()}`
          );
          return `"${res.activities.title}": ${date}`;
        },
        3
      );

      return `${t('voice.myReservations.found', { count })}. ${text}`;
    } catch (error) {
      console.error('[Voice Tool] Error in getMyReservations:', error);
      return t('voice.myReservations.error');
    }
  }, [t, lang]);

  const submitRating = useCallback(
    async (params: SubmitRatingParams): Promise<string> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return t('voice.reservation.loginRequired');
        }

        const { error } = await supabase
          .from('activity_ratings')
          .upsert({
            activity_id: params.activityId,
            user_id: user.id,
            rating: params.rating,
            comment: params.comment || null,
          });

        if (error) throw error;

        return t('voice.ratings.submitted', { rating: params.rating });
      } catch (error) {
        console.error('[Voice Tool] Error in submitRating:', error);
        return t('voice.ratings.error');
      }
    },
    [t]
  );

  const getRatings = useCallback(
    async (params: GetRatingsParams): Promise<string> => {
      try {
        const { data: ratings, error } = await supabase
          .from('activity_ratings')
          .select(`
            *,
            profiles!activity_ratings_user_id_fkey (
              full_name
            )
          `)
          .eq('activity_id', params.activityId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!ratings || ratings.length === 0) {
          return t('voice.ratings.none');
        }

        const avgRating = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
        
        return t('voice.ratings.summary', {
          title: params.activityTitle,
          average: avgRating,
          count: ratings.length,
        });
      } catch (error) {
        console.error('[Voice Tool] Error in getRatings:', error);
        return t('voice.ratings.error');
      }
    },
    [t]
  );

  const navigateToActivities = useCallback(
    async (params: NavigateToActivitiesParams = {} as any): Promise<string> => {
      try {
        if (!navigate) {
          return t('voice.navigation.error');
        }

        if (params.category) {
          const filters: ActivityFilters = {
            category: params.category,
          };
          onFiltersChange(filters);
        } else {
          onFiltersChange({});
        }

        navigate('/actividades');

        return params.category 
          ? t('voice.navigation.withCategory', { category: params.category })
          : t('voice.navigation.success');
      } catch (error) {
        console.error('[Voice Tool] Error in navigateToActivities:', error);
        return t('voice.navigation.error');
      }
    },
    [navigate, onFiltersChange, t]
  );

  return {
    searchActivities,
    reserveActivity,
    getActivityDetails,
    suggestActivities,
    navigateToActivities,
    setFilter,
    clearFilters,
    getMyReservations,
    submitRating,
    getRatings,
  };
}
