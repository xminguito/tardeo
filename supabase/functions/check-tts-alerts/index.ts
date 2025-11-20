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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[TTS Alerts] Checking alert thresholds...');

    // Check all thresholds using the database function
    const { data: thresholdChecks, error: checkError } = await supabase
      .rpc('check_tts_alert_thresholds');

    if (checkError) {
      console.error('[TTS Alerts] Error checking thresholds:', checkError);
      throw checkError;
    }

    console.log(`[TTS Alerts] Checked ${thresholdChecks?.length || 0} thresholds`);

    const triggeredAlerts = (thresholdChecks || []).filter((check: any) => check.exceeded);

    console.log(`[TTS Alerts] ${triggeredAlerts.length} alerts triggered`);

    // Create alert log entries for triggered alerts
    const alertsToLog = [];
    const now = new Date().toISOString();

    for (const alert of triggeredAlerts) {
      // Get threshold details
      const { data: threshold } = await supabase
        .from('tts_alert_thresholds')
        .select('*')
        .eq('id', alert.threshold_id)
        .single();

      if (!threshold) continue;

      const timeWindowStart = new Date(Date.now() - threshold.time_window_minutes * 60000).toISOString();

      // Count affected users in the time window
      const { count: affectedUsers } = await supabase
        .from('tts_monitoring_logs')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', timeWindowStart)
        .not('user_id', 'is', null);

      alertsToLog.push({
        threshold_id: alert.threshold_id,
        metric_name: alert.metric_name,
        metric_value: alert.metric_value,
        threshold_value: alert.threshold_value,
        alert_severity: threshold.alert_severity,
        alert_message: alert.alert_message,
        time_window_start: timeWindowStart,
        time_window_end: now,
        affected_users_count: affectedUsers || 0,
        notified_channels: ['dashboard'], // Default to dashboard
      });

      // Update threshold last_triggered_at and trigger_count
      await supabase
        .from('tts_alert_thresholds')
        .update({
          last_triggered_at: now,
          trigger_count: (threshold.trigger_count || 0) + 1,
        })
        .eq('id', alert.threshold_id);
    }

    // Insert all alert logs
    if (alertsToLog.length > 0) {
      const { error: logError } = await supabase
        .from('tts_alerts_log')
        .insert(alertsToLog);

      if (logError) {
        console.error('[TTS Alerts] Error logging alerts:', logError);
      } else {
        console.log(`[TTS Alerts] Logged ${alertsToLog.length} alerts`);
      }

      // TODO: Send notifications based on notification_channels
      // For now, just log to console
      for (const alert of alertsToLog) {
        console.warn(`[TTS Alert ${alert.alert_severity.toUpperCase()}] ${alert.alert_message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: thresholdChecks?.length || 0,
        triggered: triggeredAlerts.length,
        alerts: triggeredAlerts,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TTS Alerts] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
