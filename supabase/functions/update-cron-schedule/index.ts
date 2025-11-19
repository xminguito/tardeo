import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar que el usuario es admin
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que es admin
    const { data: isAdmin } = await supabase.rpc('is_admin', { _user_id: user.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener la configuración actual
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('cron_interval_minutes')
      .single();

    if (settingsError || !settings) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const interval = settings.cron_interval_minutes;
    const cronExpression = `*/${interval} * * * *`;

    console.log(`Updating cron job to run every ${interval} minutes`);

    // Conectar directamente a la base de datos para ejecutar los comandos de cron
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      return new Response(
        JSON.stringify({ error: 'Database URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const client = new Client(dbUrl);
    await client.connect();

    try {
      // Primero desactivar el cron job existente si existe
      await client.queryArray`SELECT cron.unschedule('invoke-send-activity-reminders')`;
      console.log('Unscheduled existing cron job');

      // Crear el nuevo cron job con el intervalo configurado
      const url = 'https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/send-activity-reminders';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y293ZW5nc25udWdseXJqdXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjkyNTAsImV4cCI6MjA3Njc0NTI1MH0.ZwhhjRJgTKl3NQuTXy0unk2DFIDDjxi7T4zLN8EVyi0';
      
      const scheduleQuery = `
        SELECT cron.schedule(
          'invoke-send-activity-reminders',
          '${cronExpression}',
          $$
          SELECT
            net.http_post(
                url:='${url}',
                headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
                body:='{}'::jsonb
            ) as request_id;
          $$
        );
      `;

      await client.queryArray(scheduleQuery);
      console.log('Created new cron job with expression:', cronExpression);

      await client.end();

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Cron job actualizado para ejecutarse cada ${interval} minutos`,
          cron_expression: cronExpression
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      await client.end();
      throw error;
    }
  } catch (error) {
    console.error('Error updating cron schedule:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
