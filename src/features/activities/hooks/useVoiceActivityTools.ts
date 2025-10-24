import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type {
  VoiceToolsMap,
  SearchActivitiesParams,
  ReserveActivityParams,
  GetActivityDetailsParams,
  SuggestActivitiesParams,
  SetFilterParams,
} from '../types/voiceTools.types';
import type { ActivityFilters } from '../types/activity.types';

export function useVoiceActivityTools(
  onFiltersChange: (filters: ActivityFilters) => void,
  currentFilters: ActivityFilters
): VoiceToolsMap {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const searchActivities = useCallback(
    async (params: SearchActivitiesParams): Promise<string> => {
      try {
        console.log('[Voice Tool] searchActivities called with:', params);

        const filters: ActivityFilters = {
          category: params.category || null,
          location: params.location || null,
          dateFrom: params.dateFrom ? new Date(params.dateFrom) : null,
          dateTo: params.dateTo ? new Date(params.dateTo) : null,
          maxCost: params.maxCost || null,
          availableOnly: params.availableOnly || false,
        };

        onFiltersChange(filters);

        let query = supabase
          .from('activities')
          .select('*')
          .order('date', { ascending: true });

        if (filters.category) query = query.eq('category', filters.category);
        if (filters.location) query = query.ilike('location', `%${filters.location}%`);
        if (filters.dateFrom) query = query.gte('date', filters.dateFrom.toISOString());
        if (filters.dateTo) query = query.lte('date', filters.dateTo.toISOString());
        if (filters.maxCost !== null) query = query.lte('cost', filters.maxCost);
        if (filters.availableOnly) {
          query = query.filter('current_participants', 'lt', 'max_participants');
        }

        const { data: activities, error } = await query;

        if (error) throw error;

        const count = activities?.length || 0;
        return `He encontrado ${count} actividades que coinciden con tu búsqueda.`;
      } catch (error) {
        console.error('[Voice Tool] Error in searchActivities:', error);
        return 'No pude buscar actividades en este momento.';
      }
    },
    [onFiltersChange]
  );

  const reserveActivity = useCallback(
    async (params: ReserveActivityParams): Promise<string> => {
      try {
        console.log('[Voice Tool] reserveActivity called with:', params);

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return 'Necesitas iniciar sesión para reservar una actividad.';
        }

        const { data: activity, error: activityError } = await supabase
          .from('activities')
          .select('current_participants, max_participants, title')
          .eq('id', params.activityId)
          .single();

        if (activityError || !activity) {
          return 'No encontré esa actividad.';
        }

        if (activity.current_participants >= activity.max_participants) {
          return `Lo siento, la actividad "${activity.title}" ya está completa.`;
        }

        const { data: existingReservation } = await supabase
          .from('activity_participants')
          .select('*')
          .eq('activity_id', params.activityId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existingReservation) {
          return `Ya estás apuntado a "${activity.title}".`;
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
          message: `Te has apuntado a "${activity.title}"`,
        });

        queryClient.invalidateQueries({ queryKey: ['activities'] });

        toast({
          title: '¡Reserva confirmada!',
          description: `Te has apuntado a "${activity.title}"`,
        });

        return `¡Perfecto! Te he apuntado a "${activity.title}". Recibirás un recordatorio antes de la actividad.`;
      } catch (error) {
        console.error('[Voice Tool] Error in reserveActivity:', error);
        return 'Hubo un problema al hacer la reserva. Inténtalo de nuevo.';
      }
    },
    [queryClient, toast, t]
  );

  const getActivityDetails = useCallback(
    async (params: GetActivityDetailsParams): Promise<string> => {
      try {
        console.log('[Voice Tool] getActivityDetails called with:', params);

        const { data: activity, error } = await supabase
          .from('activities')
          .select('*')
          .eq('id', params.activityId)
          .single();

        if (error || !activity) {
          return 'No encontré esa actividad.';
        }

        const availableSlots = activity.max_participants - activity.current_participants;
        const costText = activity.cost === 0 ? 'gratuita' : `${activity.cost} euros`;

        return `La actividad "${activity.title}" es el ${new Date(activity.date).toLocaleDateString('es-ES')} a las ${activity.time}. Se realiza en ${activity.location}. Es ${costText} y quedan ${availableSlots} plazas disponibles.`;
      } catch (error) {
        console.error('[Voice Tool] Error in getActivityDetails:', error);
        return 'No pude obtener los detalles de esa actividad.';
      }
    },
    []
  );

  const suggestActivities = useCallback(
    async (params: SuggestActivitiesParams): Promise<string> => {
      try {
        console.log('[Voice Tool] suggestActivities called with:', params);

        let query = supabase
          .from('activities')
          .select('*')
          .gte('date', new Date().toISOString())
          .filter('current_participants', 'lt', 'max_participants')
          .order('date', { ascending: true })
          .limit(5);

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

        if (!activities || activities.length === 0) {
          return 'No encontré actividades que se ajusten a tus preferencias en este momento.';
        }

        const suggestions = activities
          .map(
            (act, idx) =>
              `${idx + 1}. "${act.title}" - ${new Date(act.date).toLocaleDateString('es-ES')} en ${act.location}${act.cost > 0 ? ` (${act.cost}€)` : ' (Gratis)'}`
          )
          .join('. ');

        return `Te recomiendo estas actividades: ${suggestions}`;
      } catch (error) {
        console.error('[Voice Tool] Error in suggestActivities:', error);
        return 'No pude generar sugerencias en este momento.';
      }
    },
    []
  );

  const setFilter = useCallback(
    async (params: SetFilterParams): Promise<string> => {
      try {
        console.log('[Voice Tool] setFilter called with:', params);

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

        return `He aplicado el filtro de ${params.filterType}.`;
      } catch (error) {
        console.error('[Voice Tool] Error in setFilter:', error);
        return 'No pude aplicar ese filtro.';
      }
    },
    [currentFilters, onFiltersChange]
  );

  const clearFilters = useCallback(async (): Promise<string> => {
    try {
      console.log('[Voice Tool] clearFilters called');
      onFiltersChange({});
      return 'He limpiado todos los filtros.';
    } catch (error) {
      console.error('[Voice Tool] Error in clearFilters:', error);
      return 'No pude limpiar los filtros.';
    }
  }, [onFiltersChange]);

  const getMyReservations = useCallback(async (): Promise<string> => {
    try {
      console.log('[Voice Tool] getMyReservations called');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return 'Necesitas iniciar sesión para ver tus reservas.';
      }

      const { data: reservations, error } = await supabase
        .from('activity_participants')
        .select('*, activities(*)')
        .eq('user_id', user.id);

      if (error) throw error;

      if (!reservations || reservations.length === 0) {
        return 'No tienes ninguna reserva activa.';
      }

      const reservationsList = reservations
        .map(
          (res: any, idx: number) =>
            `${idx + 1}. "${res.activities.title}" - ${new Date(res.activities.date).toLocaleDateString('es-ES')}`
        )
        .join('. ');

      return `Tienes ${reservations.length} reservas: ${reservationsList}`;
    } catch (error) {
      console.error('[Voice Tool] Error in getMyReservations:', error);
      return 'No pude obtener tus reservas.';
    }
  }, []);

  return {
    searchActivities,
    reserveActivity,
    getActivityDetails,
    suggestActivities,
    setFilter,
    clearFilters,
    getMyReservations,
  };
}
