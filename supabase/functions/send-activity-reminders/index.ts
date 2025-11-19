import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching notification settings...');

    // Obtener configuración de notificaciones
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('*')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notification settings' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!settings || !settings.enabled) {
      console.log('Notifications are disabled');
      return new Response(
        JSON.stringify({ message: 'Notifications are disabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Notification settings:', settings);
    const hoursBeforeArray = settings.hours_before || [48, 24, 12, 6, 2];
    let notificationsCreated = 0;

    // Procesar cada ventana de tiempo configurada
    for (const hoursBefore of hoursBeforeArray) {
      const targetTime = new Date();
      targetTime.setHours(targetTime.getHours() + hoursBefore);

      // Buscar actividades en esta ventana (con margen de 30 minutos)
      const startTime = new Date(targetTime);
      startTime.setMinutes(startTime.getMinutes() - 30);
      
      const endTime = new Date(targetTime);
      endTime.setMinutes(endTime.getMinutes() + 30);

      console.log(`Checking activities for ${hoursBefore} hours window:`, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select(`
          *,
          activity_participants(user_id)
        `)
        .gte('date', startTime.toISOString())
        .lte('date', endTime.toISOString());

      if (activitiesError) {
        console.error('Error fetching activities:', activitiesError);
        continue;
      }

      if (!activities || activities.length === 0) {
        console.log(`No activities found for ${hoursBefore} hours window`);
        continue;
      }

      console.log(`Found ${activities.length} activities for ${hoursBefore} hours window`);

      // Crear notificaciones para cada participante
      for (const activity of activities) {
        if (!activity.activity_participants || activity.activity_participants.length === 0) {
          continue;
        }

        for (const participant of activity.activity_participants) {
          // Verificar si ya existe una notificación similar reciente
          const { data: existingNotif } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', participant.user_id)
            .eq('activity_id', activity.id)
            .eq('type', `reminder_${hoursBefore}h`)
            .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // últimas 2 horas
            .maybeSingle();

          if (existingNotif) {
            console.log(`Notification already sent for user ${participant.user_id}, activity ${activity.id}`);
            continue;
          }

          // Crear la notificación
          const { error: insertError } = await supabase
            .from('notifications')
            .insert({
              user_id: participant.user_id,
              activity_id: activity.id,
              type: `reminder_${hoursBefore}h`,
              title: hoursBefore === 1 
                ? '¡Tu actividad es en 1 hora!' 
                : `Recordatorio: Actividad en ${hoursBefore} horas`,
              message: `La actividad "${activity.title}" es ${hoursBefore === 1 ? 'en 1 hora' : `en ${hoursBefore} horas`}. ¡No te la pierdas!`,
            });

          if (insertError) {
            console.error('Error creating notification:', insertError);
          } else {
            notificationsCreated++;
            console.log(`Created notification for user ${participant.user_id}, activity ${activity.id}`);
          }
        }
      }
    }

    console.log(`Total notifications created: ${notificationsCreated}`);

    return new Response(
      JSON.stringify({ 
        message: 'Reminders processed', 
        count: notificationsCreated,
        windows_checked: hoursBeforeArray.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error sending reminders:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
