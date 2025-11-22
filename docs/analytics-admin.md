# Admin Analytics Dashboard

## Overview

The Admin Analytics Dashboard provides a comprehensive view of product metrics, user behavior, and voice assistant performance using Mixpanel data.

## Access

**URL**: `/admin/analytics`  
**Permission**: Admin role required (checked via `user_roles` table)

## Features

### 1. KPI Summary Cards
- **Daily Active Users (DAU)**: Users active in the last 24 hours
- **Weekly Active Users (WAU)**: Users active in the last 7 days  
- **Total Reservations**: Successful bookings in the last 7 days
- **TTS Cost Burn Rate**: Daily text-to-speech cost average

### 2. Conversion Funnel
Tracks user journey through:
1. Discovery (landing/browsing)
2. View Activity (detail page)
3. Reserve Start (click reserve button)
4. Reserve Success (completed booking)

**Features**:
- Date range selector (7d, 30d, 90d)
- Step-by-step conversion rates
- Overall conversion percentage

### 3. Retention Cohorts
Shows D1, D7, and D30 retention rates for users who interacted with the voice assistant.

**Color coding**:
- 🟢 Green: ≥50% retention
- 🟡 Yellow: 30-49% retention
- 🔴 Red: <30% retention

### 4. Live Events Stream
Real-time event feed showing:
- Event name and timestamp
- Masked user ID (first 6 chars only)
- Event properties (expandable)

**Controls**:
- Pause/Resume button
- Auto-scrolls to latest events
- Shows last 100 events

### 5. Assistant Metrics
Voice assistant performance:
- Daily invocation count (7-day chart)
- Top 5 tools by usage
- Average tool execution duration (ms)
- Error rate percentage

### 6. Event Explorer
Ad-hoc event search:
- Search by event name
- Optional property filter
- View sample payloads
- See event counts

## Setup

### 1. Environment Variables

The dashboard requires Mixpanel API access. Configure in Supabase:

```bash
# In Supabase Dashboard → Project Settings → Edge Functions → Secrets
MIXPANEL_API_SECRET=your_mixpanel_api_secret_here
```

**Where to find**:
- Go to Mixpanel → Project Settings → Service Accounts
- Create or copy existing API Secret

### 2. Current Implementation

**Status**: ✅ Dashboard UI complete with mock data  
**Status**: ⏳ Server endpoints pending (see below)

The dashboard currently displays placeholder data. To connect to real Mixpanel data, implement:

#### Required Server Endpoint

**Path**: `/api/admin/mixpanel-query` or Supabase Edge Function

**Example implementation** (supabase/functions/admin-mixpanel-query/index.ts):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MIXPANEL_API_SECRET = Deno.env.get('MIXPANEL_API_SECRET');
const MIXPANEL_API_URL = 'https://eu.mixpanel.com/api/2.0';

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { type, dateRange, params } = await req.json();

    // Build Mixpanel query based on type
    let endpoint = '';
    let queryParams = new URLSearchParams();

    switch (type) {
      case 'funnel':
        endpoint = '/funnels';
        // Configure funnel query
        break;
      case 'retention':
        endpoint = '/retention';
        // Configure retention query
        break;
      // ... other types
    }

    // Call Mixpanel API
    const response = await fetch(`${MIXPANEL_API_URL}${endpoint}?${queryParams}`, {
      headers: {
        'Authorization': `Basic ${btoa(MIXPANEL_API_SECRET + ':')}`,
      },
    });

    const data = await response.json();

    return new Response(JSON.stringify({ data }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

#### Deploy Edge Function

```bash
supabase functions deploy admin-mixpanel-query
supabase secrets set MIXPANEL_API_SECRET=your_secret_here
```

## Usage

### For Administrators

1. Navigate to `/admin`
2. Click on "Mixpanel Analytics" card
3. Dashboard loads with real-time data
4. Use date range selectors to filter data
5. Search for specific events in Event Explorer
6. Pause live stream to review events

### For Developers

#### Adding New Metrics

Edit `/src/pages/admin/AnalyticsDashboard.tsx`:

```typescript
// 1. Add new query
const { data: newMetric } = useQuery({
  queryKey: ['admin-analytics-newmetric'],
  queryFn: fetchNewMetric,
  staleTime: 5 * 60 * 1000,
});

// 2. Create fetch function
async function fetchNewMetric() {
  const response = await fetch('/api/admin/mixpanel-query', {
    method: 'POST',
    body: JSON.stringify({ type: 'newmetric' }),
  });
  return response.json();
}

// 3. Display in UI
<KPICard
  title="New Metric"
  value={newMetric?.value || 0}
  icon={Icon}
/>
```

#### Creating New Components

Follow existing patterns in `/src/pages/admin/components/`:

```typescript
// Example: NewMetricCard.tsx
import { Card } from '@/components/ui/card';

interface Props {
  data: MyData | null;
  loading?: boolean;
}

export function NewMetricCard({ data, loading }: Props) {
  if (loading) {
    return <Skeleton />;
  }
  
  return (
    <Card>
      {/* Your component */}
    </Card>
  );
}
```

## Security

### Protection Layers

1. **Route Protection**: `useAdminCheck()` hook redirects non-admins
2. **Server-Side**: Edge Function verifies auth token
3. **Data Masking**: User IDs show only first 6 characters
4. **PII Protection**: No personal information displayed

### Best Practices

- ❌ Never expose `MIXPANEL_API_SECRET` to client
- ✅ Always use server proxy for Mixpanel API calls
- ✅ Mask or hash user identifiers in UI
- ✅ Use RLS (Row Level Security) on database queries
- ✅ Log admin access for audit trail

## Performance

### Optimizations

- **Lazy Loading**: Dashboard component loads on-demand
- **React Query Caching**: 
  - KPIs: 5 min stale time
  - Funnels: 10 min
  - Retention: 15 min
  - Live events: No cache (5s refresh)
- **Bundle Size**: Lazy-loaded, not in initial bundle

### Monitoring

Check performance with:

```javascript
// Browser console
performance.getEntriesByType('navigation');
```

Expected load time: <2s for dashboard + <1s per metric

## Troubleshooting

### Dashboard shows "Configuration Required"

**Issue**: `MIXPANEL_API_SECRET` not configured

**Solution**:
```bash
supabase secrets set MIXPANEL_API_SECRET=your_secret
```

### No data appearing

**Possible causes**:
1. Edge Function not deployed
2. Invalid API secret
3. Mixpanel project has no events

**Debug**:
```bash
# Check function logs
supabase functions logs admin-mixpanel-query

# Test endpoint directly
curl -X POST https://your-project.supabase.co/functions/v1/admin-mixpanel-query \
  -H "Content-Type: application/json" \
  -d '{"type":"funnel"}'
```

### "Access Denied" message

**Issue**: User doesn't have admin role

**Solution**:
```sql
-- Grant admin role
INSERT INTO user_roles (user_id, role)
VALUES ('user-uuid-here', 'admin');
```

## Roadmap

### Current Status
- ✅ Dashboard UI complete
- ✅ Mock data working
- ✅ All components functional
- ⏳ Server endpoints (TODO)
- ⏳ Real-time events table (TODO)

### Future Enhancements
- [ ] Export metrics to CSV
- [ ] Custom date range picker
- [ ] Email reports (scheduled)
- [ ] More granular filters
- [ ] Comparison mode (period vs period)
- [ ] Custom dashboards per admin

## Support

For questions or issues:
1. Check Supabase function logs
2. Verify Mixpanel API connectivity
3. Review browser console for errors
4. Check user_roles table for admin access

---

**Last Updated**: 2025-11-22  
**Version**: 1.0  
**Status**: Beta (UI complete, backend pending)

