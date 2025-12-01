# TTS Rate Limiting Configuration

## Overview

Rate limiting has been implemented across all TTS and voice assistant endpoints to prevent abuse and control costs. The system uses a multi-layered approach:

1. **IP-based rate limiting** - Basic protection against anonymous abuse
2. **User-based throttling** - Granular per-user limits tracked in database
3. **Circuit breakers** - Automatic provider failover on errors or cost caps

## Rate Limits

### Default Limits (Configurable)

- **Per Minute**: 10 requests per user
- **Per Day**: 50 requests per user
- **IP-based**: 10 requests per IP per minute (anonymous users)

### Affected Endpoints

Rate limiting is enforced on:
- `/functions/v1/tts` - Main TTS endpoint with caching
- `/functions/v1/text-to-speech` - OpenAI TTS endpoint
- `/functions/v1/voice-chat` - Voice assistant chat endpoint

## Configuration

### Adjusting User Limits

User limits are stored in the `tts_config` table:

```sql
-- View current limits
SELECT * FROM tts_config WHERE config_key = 'per_user_limits';

-- Update limits
UPDATE tts_config 
SET config_value = jsonb_build_object(
  'requests_per_minute', 20,  -- New per-minute limit
  'requests_per_day', 100     -- New per-day limit
)
WHERE config_key = 'per_user_limits';
```

### Database Function

The throttling logic is implemented in the `check_user_tts_throttle` database function:

```sql
SELECT * FROM check_user_tts_throttle(
  _user_id := 'user-uuid-here',
  _max_per_minute := 10,
  _max_per_day := 50
);
```

Returns:
- `allowed` (boolean) - Whether request should be allowed
- `reason` (text) - Explanation if denied
- `current_minute` (integer) - Current requests in this minute
- `current_day` (integer) - Current requests today

## Usage Tracking

All TTS requests are logged to `user_tts_usage` table:

```sql
-- View user usage
SELECT 
  user_id,
  requests_last_minute,
  requests_last_day,
  last_request_at
FROM user_tts_usage
WHERE user_id = 'user-uuid-here';
```

Window resets:
- Minute window: Resets after 60 seconds
- Day window: Resets after 24 hours

## Error Responses

When rate limited, endpoints return HTTP 429 with:

```json
{
  "error": "Rate limit exceeded",
  "message": "Rate limit exceeded: 10 requests in last minute (max 10)",
  "retry_after": 60,
  "current_minute": 10,
  "current_day": 45
}
```

## Circuit Breakers

Additional protection via system flags in `system_flags` table:

### Hard Cap (Complete Disable)
```sql
INSERT INTO system_flags (flag_key, flag_value, description)
VALUES (
  'tts_hard_cap_reached',
  '{"disabled": true, "reason": "Daily budget exceeded"}'::jsonb,
  'Completely disable TTS when budget cap reached'
);
```

### Provider Circuit Breaker
```sql
INSERT INTO system_flags (flag_key, flag_value, description)
VALUES (
  'tts_eleven_disabled',
  '{"disabled": true, "reason": "ElevenLabs API errors"}'::jsonb,
  'Disable ElevenLabs and use fallback'
);
```

### Manual Override
```sql
INSERT INTO system_flags (flag_key, flag_value, description)
VALUES (
  'tts_manual_override',
  '{"enabled": true, "provider": "openai", "voice": "shimmer"}'::jsonb,
  'Force specific provider configuration'
);
```

## Monitoring

### Check Alert Thresholds

View configured alert thresholds:
```sql
SELECT * FROM tts_alert_thresholds WHERE enabled = true;
```

### View Recent Logs
```sql
-- Check rate limit violations
SELECT 
  user_id,
  COUNT(*) as violations,
  MAX(created_at) as last_violation
FROM tts_monitoring_logs
WHERE status = 'error' 
  AND error_message LIKE '%Rate limit%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
ORDER BY violations DESC;
```

## Cost Control

Rate limiting works together with:
1. **TTS caching** - Reduces duplicate requests
2. **Provider selection** - Automatic failover to cheaper providers
3. **Alert system** - Notifications when thresholds exceeded

See also:
- [TTS Cost Control Runbook](./tts-cost-control-runbook.md)
- [TTS Monitoring Guide](./tts-monitoring-guide.md)
- [TTS Optimization Guide](./tts-optimization-guide.md)
