import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { generateActivitySlug } from '@/lib/utils';
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

export function useVoiceActivityTools(
  onFiltersChange: (filters: ActivityFilters) => void,
  currentFilters: ActivityFilters,
  navigate?: (path: string) => void
): VoiceToolsMap {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const searchActivities = useCallback(
    async (params: SearchActivitiesParams): Promise<string> => {
      try {
        console.log('[Voice Tool] searchActivities called with:', params);

        // Si solo busca por categoría/título sin fechas, intentar buscar por título primero
        const isSimpleSearch = params.category && !params.dateFrom && !params.dateTo && !params.location && !params.maxCost;
        
        if (isSimpleSearch && params.category) {
          // Buscar por título primero
          const { data: titleMatches } = await supabase
            .from('activities')
            .select('*')
            .ilike('title', `%${params.category}%`)
            .order('date', { ascending: true });

          if (titleMatches && titleMatches.length === 1) {
            // Solo una coincidencia, navegar directamente
            const activity = titleMatches[0];
            const availableSlots = activity.max_participants - activity.current_participants;
            const isAvailable = availableSlots > 0;
            
            if (navigate) {
              const slug = generateActivitySlug(activity.title, activity.id);
              navigate(`/actividades/${slug}`);
            }
            
            return `Encontré la actividad "${activity.title}". Es el ${new Date(activity.date).toLocaleDateString('es-ES')} a las ${activity.time} en ${activity.location}. ${isAvailable ? `Quedan ${availableSlots} plazas disponibles` : 'Está completa'}. Te he llevado a su página.`;
          } else if (titleMatches && titleMatches.length > 1 && titleMatches.length <= 3) {
            // Pocas coincidencias, navegar a la primera y listar
            const activity = titleMatches[0];
            if (navigate) {
              const slug = generateActivitySlug(activity.title, activity.id);
              navigate(`/actividades/${slug}`);
            }
            
            const titles = titleMatches.map(a => a.title).join(', ');
            return `Encontré ${titleMatches.length} actividades relacionadas: ${titles}. Te muestro la primera: "${activity.title}".`;
          }
        }

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

        if (filters.category) query = query.ilike('title', `%${filters.category}%`);
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
        
        if (navigate && count > 0) {
          navigate('/actividades');
        }
        
        return `He encontrado ${count} actividades que coinciden con tu búsqueda. ${count > 0 ? 'Te he llevado a la página de actividades.' : ''}`;
      } catch (error) {
        console.error('[Voice Tool] Error in searchActivities:', error);
        return 'No pude buscar actividades en este momento.';
      }
    },
    [onFiltersChange, navigate]
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

        // Buscar por ID o por nombre
        let query = supabase.from('activities').select('*');
        
        if (params.activityId) {
          query = query.eq('id', params.activityId);
        } else if (params.activityTitle) {
          query = query.ilike('title', `%${params.activityTitle}%`);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
          console.error('[Voice Tool] Error querying activity:', error);
          return 'Hubo un error al buscar la actividad.';
        }

        if (!data) {
          // No se encontró, navegar a lista de actividades
          if (navigate) {
            navigate('/actividades');
          }
          return `No encontré ninguna actividad llamada "${params.activityTitle || params.activityId}". Te he llevado a la lista de actividades para que puedas explorar.`;
        }

        const activity = data;
        const availableSlots = activity.max_participants - activity.current_participants;
        const costText = activity.cost === 0 ? 'gratuita' : `${activity.cost} euros`;
        const isAvailable = availableSlots > 0;

        // Navegar al detalle de la actividad con slug amigable
        if (navigate) {
          const slug = generateActivitySlug(activity.title, activity.id);
          navigate(`/actividades/${slug}`);
        }

        return `La actividad "${activity.title}" es el ${new Date(activity.date).toLocaleDateString('es-ES')} a las ${activity.time}. Se realiza en ${activity.location}. Es ${costText} y ${isAvailable ? `quedan ${availableSlots} plazas disponibles` : 'está completa'}. Te he llevado a su página de detalles.`;
      } catch (error) {
        console.error('[Voice Tool] Error in getActivityDetails:', error);
        return 'No pude obtener los detalles de esa actividad.';
      }
    },
    [navigate]
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

  const submitRating = useCallback(
    async (params: SubmitRatingParams): Promise<string> => {
      try {
        console.log('[Voice Tool] submitRating called with:', params);

        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return 'Necesitas iniciar sesión para dejar una valoración.';
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

        return `He registrado tu valoración de ${params.rating} estrellas para "${params.activityTitle}". ${params.comment ? 'Tu comentario ha sido guardado.' : ''}`;
      } catch (error) {
        console.error('[Voice Tool] Error in submitRating:', error);
        return 'No pude guardar tu valoración. Inténtalo de nuevo.';
      }
    },
    []
  );

  const getRatings = useCallback(
    async (params: GetRatingsParams): Promise<string> => {
      try {
        console.log('[Voice Tool] getRatings called with:', params);

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
          return `La actividad "${params.activityTitle}" aún no tiene valoraciones.`;
        }

        const avgRating = (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1);
        
        const recentComments = ratings
          .filter((r: any) => r.comment)
          .slice(0, 3)
          .map((r: any) => {
            const name = r.profiles?.full_name || 'Usuario anónimo';
            return `${name} (${r.rating} estrellas): "${r.comment}"`;
          });

        let response = `La actividad "${params.activityTitle}" tiene una valoración promedio de ${avgRating} estrellas con ${ratings.length} opiniones.`;
        
        if (recentComments.length > 0) {
          response += ` Los comentarios más recientes son: ${recentComments.join('. ')}`;
        }

        return response;
      } catch (error) {
        console.error('[Voice Tool] Error in getRatings:', error);
        return 'No pude obtener las valoraciones en este momento.';
      }
    },
    []
  );

  const navigateToActivities = useCallback(
    async (params: NavigateToActivitiesParams): Promise<string> => {
      try {
        console.log('[Voice Tool] navigateToActivities called with:', params);
        
        if (!navigate) {
          return 'La función de navegación no está disponible en este momento.';
        }

        // Apply category filter if provided
        if (params.category) {
          const filters: ActivityFilters = {
            category: params.category,
          };
          onFiltersChange(filters);
        } else {
          // Clear filters to show all activities
          onFiltersChange({});
        }

        // Navigate to activities calendar page
        navigate('/actividades');

        return params.category 
          ? `Te he llevado a la sección de actividades, mostrando solo actividades de ${params.category}.`
          : 'Te he llevado a la sección de actividades donde puedes ver todas las opciones disponibles.';
      } catch (error) {
        console.error('[Voice Tool] Error in navigateToActivities:', error);
        return 'No pude navegar a la sección de actividades.';
      }
    },
    [navigate, onFiltersChange]
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
