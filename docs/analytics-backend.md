# Analytics Backend - Supabase Edge Functions

## Overview

This backend implementation provides secure server-side analytics tracking and querying for the Tardeo admin dashboard using Mixpanel.

## Architecture

```
┌─────────────┐                ┌──────────────────┐                ┌─────────────┐
│   Client    │                │  Edge Functions  │                │  Mixpanel   │
│  (React)    │──────────────▶ │   mixpanel-proxy │───────────────▶│     API     │
│             │   serverTrack  │                  │   Forward       │   (EU)      │
└─────────────┘                └──────────────────┘                └─────────────┘
                                        │
                                        │ Insert
                                        ▼
                               ┌──────────────────┐
                               │  recent_events   │
                               │     (Table)      │
                               └──────────────────┘
                                        ▲
                                        │ Query
┌─────────────┐                ┌──────────────────┐
│   Admin     │                │ admin-mixpanel-  │
│  Dashboard  │◀──────────────│     query        │
│             │   Query API    │                  │
└─────────────┘                └──────────────────┘
```

## Components

### 1. Database Table: `recent_events`

**Purpose**: Store recent analytics events for live streaming in admin dashboard.

**Schema**:
```sql
create table recent_events (
  id uuid default gen_random_uuid() primary key,
  event_name text not null,
  user_id_text text null,  -- Hashed (SHA-256) user ID
  properties jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);
```

**Indexes**:
- `idx_recent_events_created_at` (DESC) - Fast live tail queries
- `idx_recent_events_event_name` - Event filtering

**Retention**: Recommended 7 days (cleanup function included)

**RLS Policies**:
- Service role can INSERT (for mixpanel-proxy)
- Admins can SELECT (for admin-mixpanel-query)

### 2. Edge Function: `mixpanel-proxy`

**Path**: `supabase/functions/mixpanel-proxy/index.ts`

**Purpose**: Securely forward sensitive events (e.g., `reserve_success`) to Mixpanel without exposing API secrets to the client.

**Flow**:
1. Validate Supabase JWT authentication
2. Hash user IDs with SHA-256 (truncate to 32 chars)
3. Insert sanitized event into `recent_events` table
4. Forward event to Mixpanel EU API
5. Return success/error response

**Input**:
```json
{
  "event": "reserve_success",
  "properties": {
    "activity_id": "abc123",
    "amount": 25
  },
  "user_id": "optional-user-id"
}
```

**Output**:
```json
{
  "ok": true,
  "event": "reserve_success"
}
```

**Error Handling**:
- 401: Missing/invalid authentication
- 400: Missing event name
- 500: Mixpanel or DB errors

### 3. Edge Function: `admin-mixpanel-query`

**Path**: `supabase/functions/admin-mixpanel-query/index.ts`

**Purpose**: Provide aggregated analytics data to admin dashboard with caching and admin-only access.

**Query Types**:

#### a) KPI Metrics (`type: 'kpi'`)
Returns:
```json
{
  "dau": 127,
  "wau": 423,
  "totalReservations": 89,
  "ttsCostBurnRate": 4.25
}
```

#### b) Funnel Data (`type: 'funnel'`)
Input params: `{ dateRange: '7d' | '30d' | '90d' }`

Returns:
```json
{
  "steps": [
    { "step": "Discovery", "count": 1000, "conversionRate": 100 },
    { "step": "View Activity", "count": 650, "conversionRate": 65 },
    { "step": "Reserve Start", "count": 320, "conversionRate": 49.2 },
    { "step": "Reserve Success", "count": 245, "conversionRate": 76.6 }
  ],
  "totalConversion": 24.5,
  "dateRange": "7d"
}
```

#### c) Assistant Metrics (`type: 'assistant_metrics'`)
Returns:
```json
{
  "invocationsPerDay": [
    { "date": "2025-11-22", "count": 45 }
  ],
  "topTools": [
    { "tool": "searchActivities", "count": 234 }
  ],
  "avgDuration": 1250,
  "errorRate": 3.8
}
```

#### d) Events Tail (`type: 'events_tail'`)
Input params: `{ limit: 100 }`

Returns array of recent events:
```json
[
  {
    "id": "uuid",
    "timestamp": "2025-11-22T12:00:00Z",
    "eventName": "activity_view",
    "userId": "abc123...",
    "properties": { "activity_id": "123" }
  }
]
```

#### e) Retention (`type: 'retention'`)
Returns cohort retention data:
```json
[
  {
    "cohort": "Nov 15-21",
    "users": 145,
    "d1": 68.2,
    "d7": 42.1,
    "d30": 28.3
  }
]
```

**Authentication**:
- Validates Supabase JWT
- Checks `user_roles` table for `role = 'admin'`
- Returns 403 if not admin

**Caching**:
- In-memory cache with TTL
- KPI: 5 minutes
- Funnel: 10 minutes
- Assistant: 10 minutes
- Retention: 15 minutes
- Events tail: 5 seconds

## Setup Instructions

### 1. Run Database Migration

```bash
# Option 1: Via Supabase Dashboard
# Go to SQL Editor → Paste contents of migration file → Run

# Option 2: Via CLI
supabase db push
```

**Migration file**: `supabase/migrations/20251122_create_recent_events.sql`

### 2. Configure Environment Variables

Set these secrets in your Supabase project:

```bash
# Via Supabase Dashboard:
# Project Settings → Edge Functions → Secrets

# Or via CLI:
supabase secrets set MIXPANEL_API_SECRET=your_mixpanel_api_secret_here
```

**Required Secrets**:
- `MIXPANEL_API_SECRET`: Your Mixpanel project API secret
  - Find in: Mixpanel → Project Settings → Service Accounts
  - Keep this **secret** (never commit to git)

**Auto-provided** (no action needed):
- `SUPABASE_URL`: Automatically available
- `SUPABASE_SERVICE_ROLE_KEY`: Automatically available

### 3. Deploy Edge Functions

```bash
# Deploy mixpanel-proxy
supabase functions deploy mixpanel-proxy

# Deploy admin-mixpanel-query
supabase functions deploy admin-mixpanel-query

# Verify deployment
supabase functions list
```

### 4. Test Endpoints

#### Test mixpanel-proxy:

```bash
# Get access token from your app (logged in user)
ACCESS_TOKEN="your-user-jwt-token"

curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/mixpanel-proxy \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test_event",
    "properties": {
      "test": true
    }
  }'

# Expected response:
# {"ok":true,"event":"test_event"}
```

#### Test admin-mixpanel-query:

```bash
# Get admin access token
ADMIN_TOKEN="your-admin-jwt-token"

curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/admin-mixpanel-query \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "kpi"
  }'

# Expected response:
# {"data":{"dau":127,"wau":423,...}}
```

### 5. Verify in Dashboard

1. Login as admin user
2. Navigate to `/admin/analytics`
3. Dashboard should now show real data from `recent_events` table
4. KPIs, funnel, and live events should populate automatically

## Client Integration

### Using serverTrack (Reserve Success Example)

```typescript
import { serverTrack } from '@/lib/analytics';

// In your reservation success handler:
await serverTrack('reserve_success', {
  activity_id: activity.id,
  reservation_id: participationData.id,
  amount: activity.cost,
});
```

This will:
1. Call `mixpanel-proxy` Edge Function
2. Insert into `recent_events` table
3. Forward to Mixpanel API
4. Appear in admin dashboard live stream

## Security

### Best Practices ✅

- ✅ API secrets stored in Supabase secrets (never in client code)
- ✅ User IDs hashed with SHA-256 before storage
- ✅ Admin-only access enforced via RLS and JWT validation
- ✅ No PII (Personally Identifiable Information) in logs or responses
- ✅ CORS configured for your domain only (adjust in production)
- ✅ Rate limiting via in-memory cache

### What NOT to Do ❌

- ❌ Never expose `MIXPANEL_API_SECRET` to client
- ❌ Never log raw user IDs or PII
- ❌ Never skip JWT validation
- ❌ Never allow non-admins to query `admin-mixpanel-query`

## Monitoring

### Check Function Logs

```bash
# View logs in real-time
supabase functions logs mixpanel-proxy --tail
supabase functions logs admin-mixpanel-query --tail

# View recent logs
supabase functions logs mixpanel-proxy
```

### Common Log Messages

**mixpanel-proxy**:
- `[mixpanel-proxy] Successfully forwarded to Mixpanel: reserve_success` ✅
- `[mixpanel-proxy] Inserted into recent_events: reserve_success` ✅
- `[mixpanel-proxy] Mixpanel forward failed: ...` ❌

**admin-mixpanel-query**:
- `[admin-query] Query successful: kpi` ✅
- `[admin-query] Error checking admin role: ...` ❌

### Database Queries

Check recent events:
```sql
-- Last 10 events
SELECT * FROM recent_events ORDER BY created_at DESC LIMIT 10;

-- Count by event type
SELECT event_name, COUNT(*) 
FROM recent_events 
GROUP BY event_name 
ORDER BY COUNT(*) DESC;

-- Events older than 7 days
SELECT COUNT(*) FROM recent_events WHERE created_at < NOW() - INTERVAL '7 days';
```

## Maintenance

### Clean Up Old Events

Run periodically (e.g., via cron job):

```sql
-- Manual cleanup
DELETE FROM recent_events WHERE created_at < NOW() - INTERVAL '7 days';

-- Or use the provided function
SELECT cleanup_old_recent_events();
```

**TODO**: Set up pg_cron job for automatic cleanup:

```sql
-- Install pg_cron extension (if not installed)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM
SELECT cron.schedule(
  'cleanup-recent-events',
  '0 2 * * *', -- Every day at 2 AM
  'SELECT cleanup_old_recent_events();'
);
```

## Troubleshooting

### Issue: "Unauthorized" error when calling mixpanel-proxy

**Cause**: Invalid or missing JWT token

**Fix**:
```typescript
// Make sure user is logged in
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  console.error('User not logged in');
  return;
}

// serverTrack will automatically use session token
await serverTrack('event_name', { ... });
```

### Issue: "Forbidden: Admin access required"

**Cause**: User doesn't have admin role

**Fix**:
```sql
-- Grant admin role to user
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Issue: Events not appearing in Mixpanel dashboard

**Possible causes**:
1. Wrong Mixpanel API host (US vs EU)
2. Invalid `MIXPANEL_API_SECRET`
3. Events not being forwarded

**Debug**:
```bash
# Check function logs
supabase functions logs mixpanel-proxy --tail

# Test Mixpanel connectivity
curl -X POST https://api-eu.mixpanel.com/track \
  -d 'data=eyJldmVudCI6InRlc3QifQ=='
```

### Issue: Dashboard shows "No data available"

**Possible causes**:
1. No events in `recent_events` table
2. Edge Function not deployed
3. Wrong function URL

**Debug**:
```sql
-- Check if table has data
SELECT COUNT(*) FROM recent_events;

-- Check recent events
SELECT * FROM recent_events ORDER BY created_at DESC LIMIT 5;
```

```bash
# Verify functions are deployed
supabase functions list

# Test endpoint directly
curl -X POST https://your-project.supabase.co/functions/v1/admin-mixpanel-query \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"events_tail"}'
```

## Performance

### Expected Response Times

- `mixpanel-proxy`: 200-500ms (includes Mixpanel API call)
- `admin-mixpanel-query` (cached): 50-100ms
- `admin-mixpanel-query` (uncached): 200-800ms

### Optimization Tips

1. **Cache TTL**: Adjust cache expiration in `admin-mixpanel-query`
2. **DB Indexes**: Ensure indexes on `recent_events` are being used
3. **Event Retention**: Keep only last 7 days (reduces table size)
4. **Rate Limiting**: Increase `RATE_LIMIT_MS` if hitting API limits

## Future Enhancements

- [ ] Implement Mixpanel JQL queries for complex funnels
- [ ] Add Server-Sent Events (SSE) for true real-time streaming
- [ ] Implement proper retention cohort calculation
- [ ] Add event replay/debugging tool
- [ ] Create admin audit log for query access
- [ ] Add Mixpanel webhook receiver for instant notifications

## Support

For issues or questions:
1. Check function logs: `supabase functions logs <function-name>`
2. Verify DB table: `SELECT * FROM recent_events LIMIT 5;`
3. Test endpoints with curl
4. Review Mixpanel API docs: https://developer.mixpanel.com/

---

**Last Updated**: 2025-11-22  
**Version**: 1.0  
**Status**: Production Ready ✅

