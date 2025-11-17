import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting check for upcoming favorite activities...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calcular el rango de fechas (actividades en las próximas 24 horas)
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);

    console.log(`Checking activities between ${now.toISOString()} and ${tomorrow.toISOString()}`);

    // Obtener todas las actividades que están en el rango de tiempo
    const { data: upcomingActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, title, date, time')
      .gte('date', now.toISOString().split('T')[0])
      .lte('date', tomorrow.toISOString().split('T')[0]);

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      throw activitiesError;
    }

    console.log(`Found ${upcomingActivities?.length || 0} upcoming activities`);

    if (!upcomingActivities || upcomingActivities.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No upcoming activities found', notificationsSent: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    const activityIds = upcomingActivities.map((a: any) => a.id);

    // Obtener usuarios que tienen estas actividades en favoritos
    const { data: userFavorites, error: favoritesError } = await supabase
      .from('user_favorites')
      .select('user_id, activity_id')
      .in('activity_id', activityIds);

    if (favoritesError) {
      console.error('Error fetching favorites:', favoritesError);
      throw favoritesError;
    }

    console.log(`Found ${userFavorites?.length || 0} user favorites to notify`);

    if (!userFavorites || userFavorites.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No users to notify', notificationsSent: 0 }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    let notificationsSent = 0;

    // Crear notificaciones para cada usuario
    for (const favorite of userFavorites) {
      // Buscar la actividad correspondiente
      const activity = upcomingActivities.find((a: any) => a.id === favorite.activity_id);
      
      if (!activity) {
        console.log(`Activity not found for favorite ${favorite.activity_id}`);
        continue;
      }

      // Verificar si ya existe una notificación similar reciente (últimas 24 horas)
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', favorite.user_id)
        .eq('activity_id', favorite.activity_id)
        .eq('type', 'upcoming_favorite')
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

      if (existingNotifications && existingNotifications.length > 0) {
        console.log(`Notification already sent for user ${favorite.user_id} and activity ${favorite.activity_id}`);
        continue;
      }

      const activityDate = new Date(activity.date);
      const formattedDate = activityDate.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });

      // Crear la notificación
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: favorite.user_id,
          activity_id: favorite.activity_id,
          type: 'upcoming_favorite',
          title: '¡Actividad favorita próxima!',
          message: `Tu actividad favorita "${activity.title}" es mañana (${formattedDate} a las ${activity.time.slice(0, 5)})`,
          read: false,
        });

      if (notificationError) {
        console.error(`Error creating notification for user ${favorite.user_id}:`, notificationError);
      } else {
        notificationsSent++;
        console.log(`Notification created for user ${favorite.user_id} - activity ${activity.title}`);
      }
    }

    console.log(`Process completed. ${notificationsSent} notifications sent.`);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent successfully', 
        notificationsSent,
        activitiesChecked: upcomingActivities.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error: unknown) {
    console.error('Error in check-upcoming-favorites function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});