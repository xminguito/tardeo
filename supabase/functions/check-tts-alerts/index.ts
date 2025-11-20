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

      const alertData = {
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
      };

      alertsToLog.push(alertData);

      // Update threshold last_triggered_at and trigger_count
      await supabase
        .from('tts_alert_thresholds')
        .update({
          last_triggered_at: now,
          trigger_count: (threshold.trigger_count || 0) + 1,
        })
        .eq('id', alert.threshold_id);

      // Send email notifications immediately if configured
      if (threshold.notification_channels?.includes('email')) {
        try {
          // Get enabled admin emails from database
          const { data: adminEmails, error: emailError } = await supabase
            .from('admin_alert_emails')
            .select('email, name, receives_critical_only')
            .eq('enabled', true)
            .eq('receives_tts_alerts', true);

          if (emailError) {
            console.error('[TTS Alerts] Error fetching admin emails:', emailError);
          } else if (adminEmails && adminEmails.length > 0) {
            // Filter emails based on alert severity
            const recipientEmails = adminEmails.filter(admin => {
              if (admin.receives_critical_only) {
                return threshold.alert_severity === 'critical' || threshold.alert_severity === 'error';
              }
              return true;
            });

            // Send email to each recipient
            for (const admin of recipientEmails) {
              console.log(`[TTS Alerts] Sending email notification to ${admin.email} for ${alert.metric_name}`);
              
              const emailResponse = await supabase.functions.invoke('send-tts-alert-email', {
                body: {
                  alertId: alert.threshold_id,
                  metricName: alert.metric_name,
                  metricValue: alert.metric_value,
                  thresholdValue: alert.threshold_value,
                  alertSeverity: threshold.alert_severity,
                  alertMessage: alert.alert_message,
                  timeWindowStart: timeWindowStart,
                  timeWindowEnd: now,
                  affectedUsersCount: affectedUsers || 0,
                  recipientEmail: admin.email,
                },
              });
              
              if (emailResponse.error) {
                console.error(`[TTS Alerts] Failed to send email to ${admin.email}:`, emailResponse.error);
              } else {
                console.log(`[TTS Alerts] Email sent successfully to ${admin.email}:`, emailResponse.data);
                if (!alertData.notified_channels.includes('email')) {
                  alertData.notified_channels.push('email');
                }
              }
            }

            if (recipientEmails.length === 0) {
              console.log('[TTS Alerts] No admin emails match alert severity criteria');
            }
          } else {
            console.log('[TTS Alerts] No enabled admin emails found for TTS alerts');
          }
        } catch (emailError) {
          console.error('[TTS Alerts] Error sending email notification:', emailError);
        }
      }

      console.warn(`[TTS Alert ${threshold.alert_severity.toUpperCase()}] ${alert.alert_message}`);
    }

    // Insert all alert logs with notification status
    if (alertsToLog.length > 0) {
      const { error: logError } = await supabase
        .from('tts_alerts_log')
        .insert(alertsToLog);

      if (logError) {
        console.error('[TTS Alerts] Error logging alerts:', logError);
      } else {
        console.log(`[TTS Alerts] Logged ${alertsToLog.length} alerts`);
        
        // Update notification timestamps for alerts that were emailed
        const emailedAlerts = alertsToLog.filter(a => a.notified_channels.includes('email'));
        if (emailedAlerts.length > 0) {
          for (const alert of emailedAlerts) {
            await supabase
              .from('tts_alerts_log')
              .update({
                notification_sent_at: now,
              })
              .eq('threshold_id', alert.threshold_id)
              .eq('time_window_start', alert.time_window_start);
          }
        }
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
