import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ThresholdCheck {
  metric_name: string;
  current_value: number;
  threshold_value: number;
  threshold_id: string;
  alert_severity: string;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[TTS Budget] Starting budget check...');

    // Get TTS configuration
    const { data: configs } = await supabase
      .from('tts_config')
      .select('*')
      .in('config_key', ['daily_hard_cap_usd', 'slack_webhook_url', 'fallback_provider']);

    const dailyCapConfig = configs?.find(c => c.config_key === 'daily_hard_cap_usd');
    const slackWebhookConfig = configs?.find(c => c.config_key === 'slack_webhook_url');
    const fallbackConfig = configs?.find(c => c.config_key === 'fallback_provider');

    const dailyCapEnabled = dailyCapConfig?.config_value?.enabled ?? true;
    const dailyCapUSD = dailyCapConfig?.config_value?.value ?? 50;
    const slackWebhookUrl = slackWebhookConfig?.config_value?.url;

    console.log(`[TTS Budget] Daily cap: $${dailyCapUSD} (enabled: ${dailyCapEnabled})`);

    // Calculate last 24h metrics
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Get metrics for last 24h
    const { data: logs } = await supabase
      .from('tts_monitoring_logs')
      .select('provider, estimated_cost, actual_cost, status')
      .gte('created_at', twentyFourHoursAgo);

    if (!logs) {
      throw new Error('Failed to fetch TTS logs');
    }

    // Calculate metrics
    const elevenLabsCalls = logs.filter(l => l.provider === 'ElevenLabs').length;
    const openAICalls = logs.filter(l => l.provider === 'OpenAI').length;
    const totalCost = logs.reduce((sum, l) => sum + (l.actual_cost || l.estimated_cost || 0), 0);
    const errorCount = logs.filter(l => l.status === 'error').length;
    const errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

    console.log(`[TTS Budget] Metrics: ElevenLabs=${elevenLabsCalls}, OpenAI=${openAICalls}, Cost=$${totalCost.toFixed(2)}, ErrorRate=${errorRate.toFixed(2)}%`);

    // Get active thresholds
    const { data: thresholds } = await supabase
      .from('tts_alert_thresholds')
      .select('*')
      .eq('enabled', true);

    const breachedThresholds: ThresholdCheck[] = [];

    // Check each threshold
    for (const threshold of thresholds || []) {
      let currentValue = 0;

      switch (threshold.metric_name) {
        case 'elevenlabs_daily_calls':
          currentValue = elevenLabsCalls;
          break;
        case 'openai_hourly_calls':
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          const { data: hourLogs } = await supabase
            .from('tts_monitoring_logs')
            .select('provider', { count: 'exact' })
            .eq('provider', 'OpenAI')
            .gte('created_at', oneHourAgo);
          currentValue = hourLogs?.length || 0;
          break;
        case 'daily_cost_usd':
          currentValue = totalCost;
          break;
        case 'error_rate':
          currentValue = errorRate;
          break;
      }

      if (currentValue > threshold.threshold_value) {
        breachedThresholds.push({
          metric_name: threshold.metric_name,
          current_value: currentValue,
          threshold_value: threshold.threshold_value,
          threshold_id: threshold.id,
          alert_severity: threshold.alert_severity,
          description: threshold.description,
        });
        console.warn(`[TTS Budget] BREACH: ${threshold.metric_name} = ${currentValue} > ${threshold.threshold_value}`);
      }
    }

    // Handle hard daily cap
    if (dailyCapEnabled && totalCost >= dailyCapUSD) {
      console.error(`[TTS Budget] HARD CAP REACHED: $${totalCost.toFixed(2)} >= $${dailyCapUSD}`);
      
      await supabase
        .from('system_flags')
        .upsert({
          flag_key: 'tts_hard_cap_reached',
          flag_value: {
            disabled: true,
            reason: `Daily hard cap of $${dailyCapUSD} reached (current: $${totalCost.toFixed(2)})`,
            triggered_at: new Date().toISOString(),
            current_cost: totalCost,
            cap_value: dailyCapUSD,
          },
          description: 'TTS service completely disabled due to hard daily cap',
        }, {
          onConflict: 'flag_key',
        });

      breachedThresholds.push({
        metric_name: 'hard_cap',
        current_value: totalCost,
        threshold_value: dailyCapUSD,
        threshold_id: 'hard_cap',
        alert_severity: 'critical',
        description: 'Hard daily cost cap reached - TTS disabled',
      });
    }

    // Handle ElevenLabs circuit breaker
    const elevenLabsThreshold = breachedThresholds.find(
      t => t.metric_name === 'elevenlabs_daily_calls' && t.alert_severity === 'critical'
    );

    if (elevenLabsThreshold) {
      console.error(`[TTS Budget] Disabling ElevenLabs due to threshold breach`);
      
      await supabase
        .from('system_flags')
        .upsert({
          flag_key: 'tts_eleven_disabled',
          flag_value: {
            disabled: true,
            reason: `ElevenLabs daily calls exceeded threshold (${elevenLabsThreshold.current_value} > ${elevenLabsThreshold.threshold_value})`,
            triggered_at: new Date().toISOString(),
            current_calls: elevenLabsThreshold.current_value,
            threshold: elevenLabsThreshold.threshold_value,
            fallback_provider: fallbackConfig?.config_value?.provider || 'openai',
            fallback_voice: fallbackConfig?.config_value?.voice || 'shimmer',
          },
          description: 'ElevenLabs TTS disabled due to cost control',
        }, {
          onConflict: 'flag_key',
        });
    }

    // Send notifications for breached thresholds
    if (breachedThresholds.length > 0) {
      console.log(`[TTS Budget] Sending notifications for ${breachedThresholds.length} breached thresholds`);

      // Log alerts
      const alertLogs = breachedThresholds.map(breach => ({
        threshold_id: breach.threshold_id === 'hard_cap' ? null : breach.threshold_id,
        metric_name: breach.metric_name,
        metric_value: breach.current_value,
        threshold_value: breach.threshold_value,
        alert_severity: breach.alert_severity,
        alert_message: `${breach.description}: ${breach.current_value.toFixed(2)} > ${breach.threshold_value}`,
        time_window_start: twentyFourHoursAgo,
        time_window_end: new Date().toISOString(),
        notified_channels: ['dashboard'],
      }));

      await supabase.from('tts_alerts_log').insert(alertLogs);

      // Send Slack notification if configured
      if (slackWebhookUrl && slackWebhookUrl.trim()) {
        try {
          const message = {
            text: `🚨 TTS Budget Alert - ${breachedThresholds.length} threshold(s) breached`,
            blocks: [
              {
                type: 'header',
                text: {
                  type: 'plain_text',
                  text: '🚨 TTS Budget Alert',
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: breachedThresholds
                    .map(b => `*${b.metric_name}*: ${b.current_value.toFixed(2)} > ${b.threshold_value} (${b.alert_severity})`)
                    .join('\n'),
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<https://tardeo.app/admin/tts-monitor|View TTS Monitor Dashboard>`,
                },
              },
            ],
          };

          await fetch(slackWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
          });

          console.log('[TTS Budget] Slack notification sent');
        } catch (error) {
          console.error('[TTS Budget] Failed to send Slack notification:', error);
        }
      }

      // Send email notifications
      const { data: adminEmails } = await supabase
        .from('admin_alert_emails')
        .select('email, name, receives_critical_only')
        .eq('enabled', true)
        .eq('receives_tts_alerts', true);

      if (adminEmails && adminEmails.length > 0) {
        const criticalBreaches = breachedThresholds.filter(
          b => b.alert_severity === 'critical' || b.alert_severity === 'error'
        );

        for (const admin of adminEmails) {
          const relevantBreaches = admin.receives_critical_only ? criticalBreaches : breachedThresholds;
          
          if (relevantBreaches.length > 0) {
            try {
              await supabase.functions.invoke('send-tts-alert-email', {
                body: {
                  alertId: 'budget_check',
                  metricName: 'TTS Budget Check',
                  metricValue: totalCost,
                  thresholdValue: dailyCapUSD,
                  alertSeverity: 'critical',
                  alertMessage: `${relevantBreaches.length} TTS threshold(s) breached`,
                  timeWindowStart: twentyFourHoursAgo,
                  timeWindowEnd: new Date().toISOString(),
                  affectedUsersCount: logs.length,
                  recipientEmail: admin.email,
                },
              });
              console.log(`[TTS Budget] Email sent to ${admin.email}`);
            } catch (error) {
              console.error(`[TTS Budget] Failed to send email to ${admin.email}:`, error);
            }
          }
        }
      }
    } else {
      console.log('[TTS Budget] All thresholds OK - no action needed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        breached_thresholds: breachedThresholds.length,
        metrics: {
          elevenlabs_calls: elevenLabsCalls,
          openai_calls: openAICalls,
          total_cost: totalCost,
          error_rate: errorRate,
        },
        flags_set: breachedThresholds.length > 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[TTS Budget] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
