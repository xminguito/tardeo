# TTS Cost Control System - Operations Runbook

## System Overview

The TTS Cost Control System is an automated mitigation framework that monitors TTS usage, implements circuit breakers, and enforces cost caps to prevent runaway expenses.

## Architecture Components

### 1. Database Tables
- **`system_flags`**: Global feature flags and circuit breakers
- **`user_tts_usage`**: Per-user request tracking for throttling
- **`tts_config`**: Global configuration (caps, limits, fallbacks)
- **`tts_monitoring_logs`**: Historical TTS request logs
- **`tts_alert_thresholds`**: Alert threshold definitions
- **`tts_alerts_log`**: Alert history and acknowledgements
- **`admin_alert_emails`**: Email recipients for alerts

### 2. Edge Functions
- **`check-tts-budget`**: Cron job that monitors metrics and triggers mitigations
- **`tts`**: Main TTS function with circuit breaker integration
- **`send-tts-alert-email`**: Sends email notifications for alerts

### 3. Circuit Breakers
- **ElevenLabs Circuit Breaker**: Disables ElevenLabs when thresholds breached
- **Hard Daily Cap**: Completely disables TTS when cost cap reached
- **Per-User Throttling**: Rate limits individual users

## Alert Scenarios & Response

### 🔴 Critical: Hard Daily Cap Reached

**What happened:** Daily TTS cost exceeded the configured cap ($50 default)

**System Response:**
- TTS service completely disabled
- `system_flags['tts_hard_cap_reached']` set to `{disabled: true}`
- All TTS requests return 503 with text-only fallback
- Notifications sent via email + Slack

**On-Call Actions:**
1. Review dashboard at `/admin/tts-monitor`
2. Check metrics to understand what caused the spike
3. Options:
   - **Wait**: Flag auto-clears at midnight (24h rolling window)
   - **Increase cap**: Go to Configuration tab, update daily cap
   - **Clear flag manually**: System Flags tab → Clear Flag button
4. Investigate root cause:
   - Check for malicious users
   - Look for bugs causing excessive TTS calls
   - Review recent feature changes

### 🟠 Warning: ElevenLabs Circuit Breaker Active

**What happened:** ElevenLabs daily calls exceeded threshold

**System Response:**
- ElevenLabs provider disabled
- `system_flags['tts_eleven_disabled']` set
- Automatic fallback to OpenAI (shimmer voice)
- Emergency bitrate reduction to 24 kbps
- Notifications sent

**On-Call Actions:**
1. Check `/admin/tts-monitor` → System Flags tab
2. Verify fallback provider is working
3. Options:
   - **Wait**: Monitor if OpenAI can handle load
   - **Increase threshold**: Update in `/admin/tts-alerts`
   - **Manual override**: Use Manual Override button to force specific provider
   - **Clear flag**: If threshold was temporary spike

### 🟡 User Rate Limit Exceeded

**What happened:** Individual user exceeded per-minute or per-day limits

**System Response:**
- User receives 429 error with retry_after
- Suggestion to use text-only or brief mode
- Request denied, no TTS generated

**On-Call Actions:**
1. Check if user is legitimate or abusive
2. Review `user_tts_usage` table for the user
3. Options:
   - **Adjust limits**: Configuration tab → Per-User Limits
   - **Wait**: Limits auto-reset (1 minute / 24 hours)
   - **Block user**: If abusive, consider account suspension

## Manual Operations

### Enable Manual Override

Forces a specific TTS configuration, bypassing all circuit breakers:

1. Go to `/admin/tts-monitor`
2. Click "Manual Override" button
3. Configure:
   - Provider (OpenAI/ElevenLabs)
   - Voice (shimmer, alloy, etc.)
   - Bitrate (64, 32, 24 kbps)
4. Click "Activate Override"

**⚠️ Warning:** Manual override bypasses all cost controls. Use with caution and monitor closely.

To clear: System Flags tab → Clear "tts_manual_override" flag

### Clear Circuit Breakers

1. Navigate to `/admin/tts-monitor` → System Flags tab
2. Review active flags and reasons
3. Click "Clear Flag" button next to the flag
4. System will immediately resume normal operation

### Adjust Cost Limits

1. Go to `/admin/tts-monitor` → Configuration tab
2. Update values:
   - Daily cap (USD)
   - Requests per minute (per user)
   - Requests per day (per user)
3. Click "Update Configuration"
4. Changes take effect immediately

## Monitoring & Dashboards

### Primary Dashboard: `/admin/tts-monitor`

**Overview Tab:**
- Real-time metrics (24h window)
- Provider distribution
- Hourly call patterns

**System Flags Tab:**
- Active circuit breakers
- Manual overrides
- Clear flag operations

**Configuration Tab:**
- Daily cost cap settings
- Per-user rate limits

### Secondary Dashboards:
- **`/admin/tts-costs`**: Cost analysis and trends
- **`/admin/tts-alerts`**: Alert configuration and email management
- **`/admin/voice-quality`**: Quality metrics

## Cron Job Setup

The `check-tts-budget` function should run every 5-15 minutes via pg_cron:

```sql
SELECT cron.schedule(
  'check-tts-budget-job',
  '*/10 * * * *', -- Every 10 minutes
  $$
  SELECT net.http_post(
    url := 'https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/check-tts-budget',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

**Verify cron job:**
```sql
SELECT * FROM cron.job WHERE jobname = 'check-tts-budget-job';
```

## Testing & Verification

### Test Circuit Breaker

1. Temporarily lower threshold:
```sql
UPDATE tts_alert_thresholds 
SET threshold_value = 1 
WHERE metric_name = 'elevenlabs_daily_calls';
```

2. Make a few TTS requests
3. Run budget check manually:
```javascript
const { data } = await supabase.functions.invoke('check-tts-budget');
```

4. Verify flag is set in `/admin/tts-monitor`
5. Test TTS request fails with proper fallback
6. Clear flag and restore threshold

### Test Per-User Throttling

1. Lower limit temporarily:
```sql
UPDATE tts_config 
SET config_value = '{"requests_per_minute": 2, "requests_per_day": 5}'
WHERE config_key = 'per_user_limits';
```

2. Make multiple rapid TTS requests
3. Verify 429 error after limit
4. Wait 1 minute, verify reset
5. Restore normal limits

## Notification Configuration

### Email Setup

1. Add admin emails in `/admin/tts-alerts`
2. Configure which alerts trigger emails:
   - Go to Umbrales de Alertas tab
   - Toggle "Notificar por email" for each threshold
3. For testing, verify emails in Resend audience

### Slack Setup

1. Create Slack webhook in your workspace
2. Update configuration:
```sql
UPDATE tts_config 
SET config_value = '{"url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"}'
WHERE config_key = 'slack_webhook_url';
```

3. Test by triggering an alert

## Troubleshooting

### Circuit Breaker Not Activating

- Check cron job is running: `SELECT * FROM cron.job`
- Check edge function logs
- Verify thresholds are enabled
- Ensure `check-tts-budget` has service role access

### False Positives / Flapping

- Increase threshold values
- Increase time windows
- Add hysteresis (manual process: don't re-enable immediately)

### TTS Still Working Despite Flag

- Check if manual override is active
- Verify TTS function is using `selectTTSProvider`
- Check edge function deployment
- Review edge function logs for errors

### User Complaints About Rate Limits

- Review user's actual usage in `user_tts_usage`
- Check if limits are too restrictive
- Consider user tier/premium features
- Adjust limits in Configuration tab

## Emergency Procedures

### Complete TTS Outage

If TTS is completely down:

1. Check provider status (ElevenLabs, OpenAI)
2. Review recent alerts and flags
3. Enable manual override with working provider
4. Update status page / notify users
5. Investigate root cause

### Runaway Costs

If costs are spiking rapidly:

1. **Immediate**: Set hard daily cap flag manually:
```sql
INSERT INTO system_flags (flag_key, flag_value, description)
VALUES (
  'tts_hard_cap_reached',
  '{"disabled": true, "reason": "Manual emergency stop", "triggered_at": NOW()}'::jsonb,
  'Emergency cost control'
);
```

2. Review recent logs for cause
3. Check for malicious activity
4. Lower limits/caps as needed
5. Re-enable gradually with monitoring

## Metrics & KPIs

Monitor these regularly:

- **Daily cost** vs cap (target: <80% of cap)
- **Error rate** (target: <2%)
- **Cache hit rate** (target: >40%)
- **Avg generation time** (target: <3000ms)
- **Circuit breaker activations** (target: <2/week)

## Regular Maintenance

**Daily:**
- Review active alerts
- Check cost trends

**Weekly:**
- Review circuit breaker activations
- Analyze cost optimization opportunities
- Check alert threshold effectiveness

**Monthly:**
- Review and adjust caps based on usage patterns
- Optimize cache strategy
- Review user throttling effectiveness

## Contact & Escalation

For issues beyond this runbook:
- **Technical Issues**: Check edge function logs, Supabase dashboard
- **Cost Spikes**: Review with finance/product team
- **Provider Issues**: Contact ElevenLabs/OpenAI support

## Change Log

- **2025-11-20**: Initial system deployment
  - Circuit breakers for ElevenLabs and hard cap
  - Per-user throttling
  - Manual override capability
  - Email + Slack notifications
