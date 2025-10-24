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

    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    const { data: activities } = await supabase
      .from('activities')
      .select('*, activity_participants(user_id)')
      .gte('date', new Date().toISOString())
      .lte('date', tomorrow.toISOString());

    if (!activities) {
      return new Response(JSON.stringify({ message: 'No activities found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let notificationsCreated = 0;

    for (const activity of activities) {
      for (const participant of activity.activity_participants) {
        await supabase.from('notifications').insert({
          user_id: participant.user_id,
          activity_id: activity.id,
          type: 'reminder',
          title: 'Recordatorio de actividad',
          message: `La actividad "${activity.title}" es mañana`,
        });
        notificationsCreated++;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Reminders sent', 
        count: notificationsCreated 
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
