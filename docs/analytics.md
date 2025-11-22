# Analytics Documentation

## Overview

Tardeo uses Mixpanel for analytics with a privacy-first, performance-optimized approach:

- **Lazy Loading**: Mixpanel loads dynamically after user interaction or 2s idle
- **Privacy First**: Automatic PII hashing, opt-out support, no IP tracking
- **TypeScript**: Fully typed events and properties
- **Hybrid Tracking**: Client-side for UX events, server-side for sensitive data

---

## Setup

### 1. Install Dependencies

```bash
npm install mixpanel-browser
npm install -D @types/mixpanel-browser
```

### 2. Configure Environment Variables

#### Local Development (`.env.local`)
```env
VITE_MIXPANEL_TOKEN=your_mixpanel_token_here
VITE_SUPABASE_URL=https://your-project.supabase.co
```

#### Supabase Edge Function (via Supabase Dashboard)
```env
MIXPANEL_API_SECRET=your_mixpanel_api_secret
```

**Where to find tokens:**
1. Mixpanel Project Token: Project Settings → Project Token (for client-side)
2. Mixpanel API Secret: Project Settings → Service Accounts (for server-side)

### 3. Deploy Edge Function

```bash
supabase functions deploy mixpanel-proxy
supabase secrets set MIXPANEL_API_SECRET=your_secret_here
```

---

## Usage

### Basic Usage in React Components

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function ActivityList() {
  const { track } = useAnalytics();
  
  useEffect(() => {
    // Track page view
    track('view_activity_list', {
      filters: currentFilters,
    });
  }, []);
  
  const handleActivityClick = (activityId: string, category: string) => {
    track('activity_view', {
      activity_id: activityId,
      category,
    });
  };
  
  return <div>...</div>;
}
```

### Server-Side Tracking (Sensitive Events)

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function ReservationButton() {
  const { serverTrack } = useAnalytics();
  
  const handleReservation = async () => {
    const reservationId = await createReservation(activityId);
    
    // Track via server to protect sensitive data
    await serverTrack('reserve_success', {
      activity_id: activityId,
      reservation_id: reservationId,
    });
  };
  
  return <button onClick={handleReservation}>Reserve</button>;
}
```

### User Identification

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function AuthProvider() {
  const { identify } = useAnalytics();
  
  useEffect(() => {
    if (user) {
      identify(user.id, {
        role: user.role,
        created_at: user.created_at,
      });
    }
  }, [user]);
}
```

---

## Required Events

### Core Events

| Event | When | Properties | Tracking Method |
|-------|------|------------|-----------------|
| `app_opened` | App loads | `{}` | Client |
| `view_activity_list` | User views activity list | `{ filters?: {} }` | Client |
| `activity_view` | User views activity detail | `{ activity_id, category }` | Client |
| `filter_applied` | User applies filters | `{ filters: {} }` | Client |

### Reservation Events

| Event | When | Properties | Tracking Method |
|-------|------|------------|-----------------|
| `reserve_start` | User starts reservation | `{ activity_id }` | Client |
| `reserve_success` | Reservation completed | `{ activity_id, reservation_id }` | **Server** |

### Assistant Events

| Event | When | Properties | Tracking Method |
|-------|------|------------|-----------------|
| `assistant_invoked` | User opens voice assistant | `{ mode?: 'voice' \| 'text' }` | Client |
| `assistant_used_tool` | Assistant executes tool | `{ tool_name, success }` | Client |
| `assistant_failure` | Assistant encounters error | `{ error_code }` | Client |

---

## Event Schema Examples

### activity_view
```typescript
{
  activity_id: "uuid-here",
  category: "yoga"
}
```

### filter_applied
```typescript
{
  filters: {
    category: "sports",
    date_from: "2025-01-01",
    max_cost: 50
  }
}
```

### reserve_success
```typescript
{
  activity_id: "uuid-here",
  reservation_id: "uuid-here"
}
```

### assistant_used_tool
```typescript
{
  tool_name: "searchActivities",
  success: true,
  error?: "optional error message"
}
```

---

## Privacy Controls

### User Opt-Out

Provide a settings toggle:

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function PrivacySettings() {
  const { optOut, optIn } = useAnalytics();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  
  const handleToggle = () => {
    if (analyticsEnabled) {
      optOut();
      setAnalyticsEnabled(false);
    } else {
      optIn();
      setAnalyticsEnabled(true);
    }
  };
  
  return (
    <div>
      <label>
        <input 
          type="checkbox" 
          checked={analyticsEnabled}
          onChange={handleToggle}
        />
        Enable analytics to help improve the app
      </label>
      <p className="text-sm text-muted-foreground">
        We never collect personal information. 
        All data is anonymized and used only to improve the user experience.
      </p>
    </div>
  );
}
```

### What Data is Protected

Automatically hashed before sending:
- `email`
- `phone`
- `full_name`
- `name`

Never sent:
- IP address (disabled in config)
- Precise location
- Payment information

---

## Adding New Events

### 1. Add Type Definition

Edit `src/lib/analytics/types.ts`:

```typescript
export type AnalyticsEventNames =
  | 'app_opened'
  | 'view_activity_list'
  // ... existing events
  | 'new_event_name'; // Add here

export interface AnalyticsEventPayloads {
  // ... existing payloads
  new_event_name: {
    property1: string;
    property2?: number;
  };
}
```

### 2. Use Type-Safe Tracking

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function MyComponent() {
  const { track } = useAnalytics();
  
  // TypeScript will autocomplete and validate
  track('new_event_name', {
    property1: 'value',
    property2: 123,
  });
}
```

---

## Testing

### Run Unit Tests

```bash
npm run test src/lib/analytics
```

### Test in Development

1. Set `VITE_MIXPANEL_TOKEN=test_token_123` in `.env.local`
2. Open browser console
3. Look for `[Analytics]` logs
4. Verify events appear in Mixpanel Live View

### Test Opt-Out

```javascript
// In browser console
localStorage.setItem('analytics_opt_out', 'true');
// Reload page - analytics should be disabled
```

---

## Monitoring

### Check Analytics Status

```typescript
import { getAnalyticsStatus } from '@/lib/analytics';

const status = getAnalyticsStatus();
console.log('Initialized:', status.initialized);
console.log('Queue length:', status.queueLength);
console.log('Disabled:', status.disabled);
```

### Debug Mode

Set `VITE_MIXPANEL_TOKEN` and check console logs:
- `[Analytics] Mixpanel initialized successfully`
- `[Analytics] Tracked: event_name { props }`
- `[Analytics] Queueing event: event_name` (before init)

---

## Performance

### Bundle Size Impact

- **Initial bundle**: +0 KB (dynamic import)
- **After interaction**: +~40 KB (mixpanel-browser)

### Load Timing

1. App loads: No analytics loaded
2. User interacts OR 2s passes: Analytics loads asynchronously
3. Queued events are sent immediately

### Network Impact

- Rate limited to 1 event per 100ms
- Events batched when possible
- Cached in queue if offline

---

## Troubleshooting

### Events Not Appearing in Mixpanel

1. Check token: `console.log(import.meta.env.VITE_MIXPANEL_TOKEN)`
2. Check init: `getAnalyticsStatus().initialized`
3. Check opt-out: `localStorage.getItem('analytics_opt_out')`
4. Check browser console for `[Analytics]` logs

### Server-Side Events Failing

1. Verify Edge Function deployed: `supabase functions list`
2. Check secret: `supabase secrets list`
3. Check function logs: `supabase functions logs mixpanel-proxy`
4. Test endpoint: `curl -X POST your-url/functions/v1/mixpanel-proxy`

### PII Not Being Hashed

Check browser console - should see:
```
[Analytics] Tracked: event_name { email_hash: "abc123...", email: undefined }
```

---

## Best Practices

1. **Track user intent, not just clicks**: Track meaningful actions
2. **Keep properties minimal**: Only essential data
3. **Use server-side for sensitive data**: Reservations, payments, etc.
4. **Test opt-out flow**: Ensure users can disable tracking
5. **Document new events**: Update this file when adding events
6. **Review data quarterly**: Remove unused events

---

## GDPR Compliance

Tardeo analytics is designed to be GDPR-compliant:

✅ **Consent**: User can opt-out via settings
✅ **Minimal data**: Only essential UX metrics
✅ **Anonymization**: PII is hashed automatically
✅ **No IP tracking**: Disabled in Mixpanel config
✅ **Data retention**: Configurable in Mixpanel (default 5 years)
✅ **Right to erasure**: Use `mixpanel.people.delete_user(userId)`

---

## Support

For questions or issues:
1. Check this documentation
2. Review [Mixpanel docs](https://docs.mixpanel.com/)
3. Check `src/lib/analytics/__tests__` for examples
4. Contact dev team

---

**Last updated**: 2025-11-21


