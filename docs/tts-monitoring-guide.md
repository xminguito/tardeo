# TTS Real-Time Monitoring & Alerting System

## Overview

The TTS Monitoring System provides comprehensive real-time tracking and alerting for Text-to-Speech usage across the Tardeo platform. It monitors costs, performance, cache efficiency, and triggers configurable alerts when thresholds are exceeded.

## Architecture

```
┌─────────────────┐
│  TTS Request    │
│  (Voice Tool)   │
└────────┬────────┘
         │
         v
┌─────────────────┐     ┌──────────────────┐
│ TTS Edge Func   │────>│ tts_monitoring   │
│ (tts/index.ts)  │     │     _logs        │
└────────┬────────┘     └──────────────────┘
         │                       │
         │                       v
         │              ┌──────────────────┐
         │              │ tts_monitoring   │
         │              │    _stats        │
         │              │ (materialized)   │
         │              └──────────────────┘
         │                       │
         v                       v
┌─────────────────┐     ┌──────────────────┐
│  check-tts-     │────>│ tts_alerts_log   │
│  alerts         │     │ tts_alert_       │
│  (Edge Function)│     │   thresholds     │
└─────────────────┘     └──────────────────┘
         │
         v
┌─────────────────┐
│ /admin/tts-     │
│    monitor      │
│  (Dashboard)    │
└─────────────────┘
```

## Database Schema

### 1. `tts_monitoring_logs` Table

Stores detailed logs of every TTS request for real-time monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who made the request (nullable) |
| `session_id` | TEXT | Voice conversation session ID |
| `request_id` | TEXT | Unique request identifier |
| `text_input` | TEXT | Input text sent to TTS |
| `text_length` | INTEGER | Character count |
| `provider` | TEXT | TTS provider ('ElevenLabs', 'OpenAI', 'cached') |
| `voice_name` | TEXT | Voice model used |
| `mode` | TEXT | Response mode ('brief', 'full') |
| `cached` | BOOLEAN | Whether response was cached |
| `cache_hit_saved_cost` | NUMERIC | Cost saved by cache hit |
| `generation_time_ms` | INTEGER | Time to generate audio (ms) |
| `audio_duration_seconds` | NUMERIC | Estimated audio duration |
| `estimated_cost` | NUMERIC | Estimated cost in USD |
| `actual_cost` | NUMERIC | Actual billed cost (if available) |
| `status` | TEXT | 'success', 'error', 'timeout' |
| `error_message` | TEXT | Error details if failed |
| `created_at` | TIMESTAMP | Request timestamp |
| `request_metadata` | JSONB | Additional metadata |

**RLS Policies:**
- Service role: Full access (for edge functions)
- Admins: Read access to all logs

### 2. `tts_alert_thresholds` Table

Configurable alert thresholds for monitoring metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `metric_name` | TEXT | Unique metric identifier |
| `threshold_value` | NUMERIC | Alert threshold |
| `time_window_minutes` | INTEGER | Time window for metric calculation |
| `enabled` | BOOLEAN | Whether alert is active |
| `alert_severity` | TEXT | 'info', 'warning', 'critical' |
| `notification_channels` | TEXT[] | ['dashboard', 'email', 'slack'] |
| `description` | TEXT | Human-readable description |
| `last_triggered_at` | TIMESTAMP | When alert last triggered |
| `trigger_count` | INTEGER | Total times triggered |
| `created_at` | TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | Last updated timestamp |

**Default Thresholds:**
- `elevenlabs_daily_calls`: 1000 calls/day
- `openai_hourly_calls`: 500 calls/hour
- `daily_cost_usd`: $50/day
- `cache_hit_rate`: <30% (last hour)
- `error_rate`: >10% (last hour)
- `avg_generation_time_ms`: >2000ms (last hour)

**RLS Policies:**
- Admins: Full CRUD access

### 3. `tts_alerts_log` Table

Log of triggered alerts for admin review.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `threshold_id` | UUID | Reference to threshold config |
| `metric_name` | TEXT | Metric that triggered alert |
| `metric_value` | NUMERIC | Current metric value |
| `threshold_value` | NUMERIC | Threshold that was exceeded |
| `alert_severity` | TEXT | Alert severity level |
| `alert_message` | TEXT | Human-readable alert message |
| `time_window_start` | TIMESTAMP | Metric calculation window start |
| `time_window_end` | TIMESTAMP | Metric calculation window end |
| `affected_users_count` | INTEGER | Number of users affected |
| `notified_channels` | TEXT[] | Channels where alert was sent |
| `notification_sent_at` | TIMESTAMP | When notification was sent |
| `acknowledged` | BOOLEAN | Whether alert was acknowledged |
| `acknowledged_by` | UUID | Admin who acknowledged |
| `acknowledged_at` | TIMESTAMP | When acknowledged |
| `created_at` | TIMESTAMP | Alert timestamp |

**RLS Policies:**
- Admins: Read access and update for acknowledgment

### 4. `tts_monitoring_stats` Materialized View

Pre-aggregated hourly statistics for dashboard performance.

| Column | Description |
|--------|-------------|
| `time_bucket` | Hour timestamp |
| `provider` | TTS provider |
| `total_requests` | Request count |
| `unique_users` | Unique users |
| `unique_sessions` | Unique sessions |
| `avg_text_length` | Average chars per request |
| `avg_generation_time_ms` | Average generation time |
| `avg_audio_duration_seconds` | Average audio duration |
| `cache_hits` | Number of cache hits |
| `cache_hit_rate` | Cache hit percentage |
| `total_cache_savings` | Total cost saved by cache |
| `total_estimated_cost` | Total estimated cost |
| `error_count` | Number of errors |
| `error_rate` | Error percentage |
| `brief_mode_count` | Requests in brief mode |
| `full_mode_count` | Requests in full mode |

**Refresh:** Refreshed on-demand via `refresh_tts_monitoring_stats()` function

## Edge Functions

### 1. TTS Function (Updated)

**Path:** `supabase/functions/tts/index.ts`

**Changes:**
- Logs every request to `tts_monitoring_logs`
- Tracks cache hits with saved costs
- Records generation time and estimated costs
- Logs errors with status and error messages

**Monitored Metrics:**
- Request ID (unique)
- User ID (if authenticated)
- Text length
- Provider used
- Cache hit/miss
- Generation time
- Estimated cost
- Status (success/error)

### 2. Check TTS Alerts

**Path:** `supabase/functions/check-tts-alerts/index.ts`

**Purpose:** Checks all enabled alert thresholds and creates alert logs when exceeded.

**Features:**
- Calls `check_tts_alert_thresholds()` database function
- Creates alert log entries for exceeded thresholds
- Updates threshold trigger counts
- Returns list of triggered alerts

**Invocation:**
```typescript
const { data, error } = await supabase.functions.invoke('check-tts-alerts');
// Returns: { checked: number, triggered: number, alerts: Alert[] }
```

**Recommended Schedule:** Every 5-15 minutes via cron job

## Dashboard Features

### Access

**URL:** `/admin/tts-monitor`  
**Permission:** Admin only

### Real-Time Stats (24h)

1. **Total Requests**
   - Count of all TTS requests in last 24 hours
   - Breakdown by provider

2. **Cache Hit Rate**
   - Percentage of cached vs generated responses
   - Target: >30%
   - Visual indicator (green if above target)

3. **Avg Generation Time**
   - Average milliseconds to generate audio
   - Target: <2000ms
   - Visual indicator

4. **Error Rate**
   - Percentage of failed requests
   - Target: <5%
   - Visual indicator (red if above 10%)

5. **Total Cost (24h)**
   - Sum of estimated costs
   - Budget: $50/day
   - Visual indicator

### Live Metrics Tab

**Requests by Provider (Pie Chart)**
- Distribution of requests between ElevenLabs, OpenAI, and cache
- Last 24 hours

**Hourly Call Volume (Area Chart)**
- Stacked area chart showing ElevenLabs vs OpenAI calls
- Last 24 hours by hour
- Helps identify usage patterns and peak times

### Alert Configuration Tab

**Threshold Management**
- List of all configurable thresholds
- Enable/disable toggles
- Edit threshold values and time windows
- View severity levels and descriptions
- Track last triggered times

**Editable Fields:**
- Threshold value
- Time window (minutes)
- Enabled/disabled status

### Active Alerts Section

**Top of Dashboard:**
- Shows unacknowledged alerts in real-time
- Color-coded by severity (info/warning/critical)
- Shows metric value vs threshold
- Timestamp of when triggered
- One-click acknowledgment

## Alert System

### How Alerts Work

1. **Automatic Checking:** Call `check-tts-alerts` edge function periodically (recommended: every 5-15 minutes)

2. **Threshold Evaluation:** Function checks each enabled threshold against current metrics

3. **Alert Creation:** When threshold exceeded, creates entry in `tts_alerts_log`

4. **Dashboard Display:** Active alerts shown in real-time on dashboard

5. **Acknowledgment:** Admins can acknowledge alerts to mark as resolved

### Alert Severity Levels

**Info (Blue):**
- Informational notices
- No immediate action required
- Example: Approaching 70% of daily budget

**Warning (Yellow):**
- Requires attention but not urgent
- Monitor and optimize if recurring
- Example: Cache hit rate <30%, Cost >$40/day

**Critical (Red):**
- Immediate action required
- May impact service or incur high costs
- Example: Error rate >10%, Cost >$50/day

### Configuring Alert Thresholds

**Via Dashboard:**
1. Navigate to `/admin/tts-monitor`
2. Go to "Alert Configuration" tab
3. Click settings icon on any threshold
4. Adjust threshold value and time window
5. Toggle enabled/disabled
6. Save changes

**Via Database:**
```sql
UPDATE public.tts_alert_thresholds
SET threshold_value = 75.00
WHERE metric_name = 'daily_cost_usd';
```

### Notification Channels

**Currently Supported:**
- Dashboard (always enabled)

**Planned:**
- Email notifications (requires SMTP configuration)
- Slack webhooks (requires Slack app setup)

## Setting Up Automated Alerts

### Option 1: Cron Job (Recommended)

Enable `pg_cron` extension and schedule the alert checker:

```sql
SELECT cron.schedule(
  'check-tts-alerts-every-15min',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT net.http_post(
    url:='https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/check-tts-alerts',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

### Option 2: Manual Trigger

Click "Check Alerts" button in the dashboard to manually trigger alert checking.

### Option 3: External Monitoring

Use external cron services (e.g., GitHub Actions, AWS Lambda) to call the edge function periodically:

```bash
curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/check-tts-alerts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Cost Estimation

### Provider Pricing

**ElevenLabs:**
- $0.10 per 1,000 characters
- Higher quality, better for longer responses

**OpenAI TTS:**
- $0.015 per 1,000 characters  
- Lower cost, good for short responses

### Example Calculations

**Scenario: 1,000 users, 10 requests/user/month**

| Metric | Value |
|--------|-------|
| Total requests | 10,000/month |
| Avg text length | 100 chars |
| Total characters | 1,000,000 chars |
| **Without cache (ElevenLabs)** | $100/month |
| **With 40% cache hit rate** | $60/month |
| **Monthly savings** | $40 |

## Integration Examples

### Tracking TTS Requests

The TTS edge functions automatically log monitoring data. No additional code needed in clients.

### Checking Alerts Programmatically

```typescript
import { supabase } from '@/integrations/supabase/client';

async function checkTTSAlerts() {
  const { data, error } = await supabase.functions.invoke('check-tts-alerts');
  
  if (error) {
    console.error('Alert check failed:', error);
    return;
  }
  
  console.log(`Checked ${data.checked} thresholds`);
  console.log(`${data.triggered} alerts triggered`);
  
  return data.alerts;
}
```

### Fetching Active Alerts

```typescript
const { data: activeAlerts } = await supabase
  .from('tts_alerts_log')
  .select('*')
  .eq('acknowledged', false)
  .order('created_at', { ascending: false });

console.log(`${activeAlerts?.length} unacknowledged alerts`);
```

### Acknowledging an Alert

```typescript
const { data: { user } } = await supabase.auth.getUser();

await supabase
  .from('tts_alerts_log')
  .update({
    acknowledged: true,
    acknowledged_by: user.id,
    acknowledged_at: new Date().toISOString(),
  })
  .eq('id', alertId);
```

## Monitoring Best Practices

### 1. Set Realistic Thresholds

Start with conservative thresholds and adjust based on actual usage:

- **Day 1-7:** Monitor without alerts to establish baseline
- **Week 2:** Set thresholds at 150% of baseline averages
- **Ongoing:** Adjust monthly based on growth and optimization

### 2. Review Alerts Weekly

- Acknowledge resolved alerts promptly
- Investigate recurring alerts
- Adjust thresholds if too noisy

### 3. Optimize Based on Data

Use monitoring data to identify optimization opportunities:

**High Generation Times:**
- Consider switching providers for specific use cases
- Implement response length limits
- Use brief mode more aggressively

**Low Cache Hit Rates:**
- Review template usage
- Canonicalize more aggressively
- Identify frequently repeated responses

**High Error Rates:**
- Check API keys and quotas
- Implement better error handling
- Add retry logic with backoff

**High Costs:**
- Increase cache hit rate
- Shorten responses
- Use cheaper provider for simple responses

### 4. Dashboard Auto-Refresh

The dashboard auto-refreshes every 30 seconds to show real-time data. Manual refresh is also available.

### 5. Archive Old Logs

Consider archiving logs older than 30-90 days to maintain performance:

```sql
-- Archive logs older than 90 days
DELETE FROM public.tts_monitoring_logs
WHERE created_at < NOW() - INTERVAL '90 days';
```

## Alert Response Playbook

### Alert: Daily Cost Exceeds $50

**Severity:** Critical

**Immediate Actions:**
1. Check dashboard for usage spike
2. Identify top users/sessions consuming TTS
3. Temporarily increase cache TTL
4. Review recent code changes
5. Consider implementing rate limiting per user

**Long-term Solutions:**
- Optimize response templates
- Increase brief mode usage
- Implement cost budgets per user

### Alert: Cache Hit Rate Below 30%

**Severity:** Warning

**Immediate Actions:**
1. Review recent template changes
2. Check canonicalization logic
3. Identify frequently repeated responses that aren't caching

**Long-term Solutions:**
- Add more template-based responses
- Improve canonicalization patterns
- Pre-generate common responses

### Alert: Error Rate Above 10%

**Severity:** Critical

**Immediate Actions:**
1. Check edge function logs for error patterns
2. Verify API keys are valid
3. Check provider status pages
4. Implement fallback provider

**Long-term Solutions:**
- Add comprehensive error handling
- Implement retry logic
- Monitor provider reliability

### Alert: ElevenLabs Daily Calls Exceed 1000

**Severity:** Warning

**Immediate Actions:**
1. Check if spike is legitimate (marketing campaign, viral growth)
2. Review quota limits with ElevenLabs
3. Consider switching some traffic to OpenAI

**Long-term Solutions:**
- Implement dynamic provider selection
- Set per-user quotas
- Increase cache utilization

## Performance Optimization

### Cache Hit Rate Optimization

**Target: >40%**

**Strategies:**
1. Use template-based responses (see `tts-optimization-guide.md`)
2. Canonicalize dates, times, numbers
3. Extend cache TTL (currently 30 days)
4. Pre-generate common responses

**Expected Impact:**
- 40% cache rate = 40% cost reduction
- 60% cache rate = 60% cost reduction

### Response Length Optimization

**Target: <100 chars average**

**Strategies:**
1. Use `brief` mode when possible
2. Truncate lists to max 3 items
3. Remove redundant phrases
4. Use i18n templates

**Expected Impact:**
- 50% length reduction = 50% cost reduction
- Faster response times
- Better UX for elderly users

### Provider Selection Optimization

**Use Case-Based Selection:**
- **Short responses (<50 chars):** OpenAI (7x cheaper)
- **Long responses (>200 chars):** ElevenLabs (better quality)
- **Emotional content:** ElevenLabs (more expressive)
- **Lists and data:** OpenAI (sufficient quality)

**Expected Impact:**
- 30-40% cost reduction with smart routing

## Troubleshooting

### Dashboard Shows No Data

**Causes:**
1. No TTS requests have been made
2. Edge functions not logging properly
3. RLS policy issues

**Solutions:**
1. Test TTS by using voice assistant
2. Check edge function logs
3. Verify service role key is configured
4. Check RLS policies in Supabase dashboard

### Alerts Not Triggering

**Causes:**
1. Thresholds not configured correctly
2. Alert checking not scheduled
3. Edge function errors

**Solutions:**
1. Manually click "Check Alerts" in dashboard
2. Review threshold configuration
3. Check `check-tts-alerts` edge function logs
4. Set up cron job for automatic checking

### High Costs Despite Optimization

**Investigation Steps:**
1. Check cache hit rate (should be >40%)
2. Review average text length (should be <100 chars)
3. Identify top users/sessions by cost
4. Look for spikes in usage patterns
5. Verify provider pricing

**Common Issues:**
- Cache not working (check TTL, canonicalization)
- Long verbose responses (optimize templates)
- Wrong provider for use case (switch to OpenAI for short)
- Bot/spam traffic (implement user quotas)

### Materialized View Not Refreshing

**Error:** "cannot refresh materialized view concurrently"

**Cause:** View needs to be created without `CONCURRENTLY` first

**Solution:**
```sql
REFRESH MATERIALIZED VIEW public.tts_monitoring_stats;
```

Then subsequent concurrent refreshes will work.

## Security Considerations

### PII in Logs

**Concern:** `text_input` may contain sensitive user data

**Mitigations:**
1. Implement data retention policy (auto-delete after 90 days)
2. Consider hashing or redacting PII
3. Restrict admin access to sensitive logs
4. Comply with GDPR/privacy regulations

### API Key Protection

**Critical:** Never expose API keys in logs or responses

**Verification:**
- API keys stored in Supabase secrets
- Edge functions use `Deno.env.get()`
- No keys in client-side code
- No keys in database logs

### Rate Limiting

**Current Implementation:**
- 10 requests per IP per minute (in `tts/index.ts`)

**Recommendations:**
- Add per-user quotas (e.g., 100 requests/day)
- Implement exponential backoff for errors
- Monitor and block suspicious IPs

## Future Enhancements

### Planned Features

1. **Email Notifications**
   - Send alerts to admin email
   - Daily/weekly digest reports
   - Requires SMTP configuration

2. **Slack Integration**
   - Post alerts to Slack channel
   - Interactive alert acknowledgment
   - Requires Slack webhook URL

3. **Cost Budgets**
   - Set monthly/daily budgets
   - Auto-disable TTS when budget exceeded
   - Per-user cost tracking

4. **A/B Testing**
   - Compare ElevenLabs vs OpenAI quality
   - Test different voice models
   - Optimize based on user feedback

5. **Predictive Alerting**
   - ML-based anomaly detection
   - Predict cost overruns before they happen
   - Seasonal usage pattern analysis

6. **WebSocket Real-Time Updates**
   - Live dashboard updates without refresh
   - Real-time alert notifications
   - Live request streaming

## API Reference

### Database Functions

**`check_tts_alert_thresholds()`**
```sql
SELECT * FROM check_tts_alert_thresholds();
```
Returns table with threshold check results.

**`refresh_tts_monitoring_stats()`**
```sql
SELECT refresh_tts_monitoring_stats();
```
Refreshes the materialized view with latest data.

### Edge Functions

**`check-tts-alerts`**
```bash
POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/check-tts-alerts
Authorization: Bearer YOUR_ANON_KEY
```

Response:
```json
{
  "success": true,
  "checked": 6,
  "triggered": 2,
  "alerts": [
    {
      "metric_name": "cache_hit_rate",
      "metric_value": 25.5,
      "threshold_value": 30,
      "exceeded": true,
      "alert_message": "Cache hit rate below 30% in last hour (Current: 25.5, Threshold: 30)"
    }
  ]
}
```

## Example Usage Patterns

### Daily Monitoring Routine

1. **Morning (9 AM):**
   - Check dashboard for overnight usage
   - Review any triggered alerts
   - Acknowledge resolved alerts

2. **Afternoon (2 PM):**
   - Review cache hit rate trends
   - Check for cost anomalies
   - Adjust thresholds if needed

3. **Evening (6 PM):**
   - Review daily costs
   - Plan optimizations for next day
   - Archive old logs if needed

### Weekly Review

1. Compare metrics week-over-week
2. Identify optimization opportunities
3. Adjust alert thresholds based on trends
4. Review user feedback and quality scores
5. Update TTS templates if needed

### Monthly Reporting

1. Generate cost report from dashboard
2. Calculate ROI of optimizations
3. Present metrics to stakeholders
4. Plan next month's optimization efforts
5. Review and update alert thresholds

## Conclusion

The TTS Monitoring & Alerting System provides comprehensive visibility into TTS usage, costs, and performance. By combining real-time tracking, configurable alerts, and actionable dashboards, admins can proactively manage TTS costs and ensure service quality.

**Key Benefits:**
- 📊 Real-time visibility into TTS usage
- 💰 Cost tracking and budget management
- 🚨 Proactive alerting for issues
- 📈 Performance optimization insights
- 🎯 Data-driven decision making

**Next Steps:**
1. Set up cron job for automated alert checking
2. Establish baseline metrics
3. Configure alert thresholds
4. Implement optimization strategies
5. Monitor and iterate
