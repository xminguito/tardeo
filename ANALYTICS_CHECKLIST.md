# 📋 Analytics Implementation Checklist

Follow this step-by-step checklist to integrate Mixpanel analytics.

---

## Phase 1: Setup (5 minutes)

### ✅ Files Created
All files are already created and ready:
- [x] `src/lib/analytics/index.ts`
- [x] `src/lib/analytics/types.ts`
- [x] `src/lib/analytics/mixpanel.client.ts`
- [x] `src/lib/analytics/useAnalytics.ts`
- [x] `src/lib/analytics/__tests__/analytics.test.ts`
- [x] `supabase/functions/mixpanel-proxy/index.ts`
- [x] Documentation files

### 🔲 Install Dependencies
```bash
npm install mixpanel-browser
npm install -D @types/mixpanel-browser
```

- [ ] Run install command
- [ ] Verify installation: `npm list mixpanel-browser`

### 🔲 Configure Environment
```bash
# Create .env.local
echo "VITE_MIXPANEL_TOKEN=__REDACTED__" >> .env.local
```

- [ ] Get token from Mixpanel Dashboard → Project Settings
- [ ] Replace `__REDACTED__` with actual token
- [ ] Verify: `cat .env.local`
- [ ] Add `.env.local` to `.gitignore` (if not already)

---

## Phase 2: Basic Integration (10 minutes)

### 🔲 Initialize Analytics

Edit `src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { initAnalytics, track } from '@/lib/analytics';

function App() {
  useEffect(() => {
    initAnalytics();
    track('app_opened', {});
  }, []);
  
  // ... rest of your app
}
```

- [ ] Add imports
- [ ] Call `initAnalytics()` in useEffect
- [ ] Track `app_opened` event
- [ ] Save file

### 🔲 Test Locally

```bash
npm run dev
```

- [ ] Open http://localhost:5173
- [ ] Open DevTools Console
- [ ] Look for: `[Analytics] Mixpanel initialized successfully`
- [ ] Look for: `[Analytics] Tracked: app_opened`
- [ ] Open Mixpanel Live View
- [ ] Verify `app_opened` event appears

---

## Phase 3: Component Integration (30 minutes)

### 🔲 Activity List Page

Location: `src/pages/ActivitiesCalendar.tsx` (or similar)

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function ActivityList() {
  const { track } = useAnalytics();
  
  useEffect(() => {
    track('view_activity_list', {});
  }, []);
  
  // Track activity clicks
  const handleActivityClick = (activity) => {
    track('activity_view', {
      activity_id: activity.id,
      category: activity.category,
    });
  };
}
```

- [ ] Import `useAnalytics`
- [ ] Track `view_activity_list` on page view
- [ ] Track `activity_view` on card click
- [ ] Test: Click activity, verify event in Mixpanel

### 🔲 Activity Detail Page

Location: `src/pages/ActivityDetail.tsx`

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function ActivityDetail() {
  const { track, serverTrack } = useAnalytics();
  
  useEffect(() => {
    track('activity_view', {
      activity_id: activityId,
      category: activity?.category,
    });
  }, [activity]);
  
  const handleReserve = async () => {
    track('reserve_start', { activity_id: activityId });
    
    // ... create reservation ...
    
    await serverTrack('reserve_success', {
      activity_id: activityId,
      reservation_id: reservation.id,
    });
  };
}
```

- [ ] Track `activity_view` on page load
- [ ] Track `reserve_start` when user clicks reserve
- [ ] Track `reserve_success` after reservation (server-side)
- [ ] Test: Make reservation, verify events

### 🔲 Voice Assistant

Location: `src/components/VoiceAssistant.tsx`

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';

function VoiceAssistant() {
  const { track } = useAnalytics();
  
  const conversation = useConversation({
    onConnect: () => {
      track('assistant_invoked', { mode: 'voice' });
    },
    clientTools: {
      searchActivities: async (params) => {
        track('assistant_used_tool', {
          tool_name: 'searchActivities',
          success: true,
        });
        // ... rest of tool
      },
    },
    onError: (error) => {
      track('assistant_failure', {
        error_code: 'connection_failed',
      });
    },
  });
}
```

- [ ] Track `assistant_invoked` on connection
- [ ] Track `assistant_used_tool` for each tool
- [ ] Track `assistant_failure` on errors
- [ ] Test: Use voice assistant, verify events

### 🔲 Filter Component

Track when users apply filters:

```typescript
const handleFilterChange = (newFilters) => {
  track('filter_applied', {
    filters: newFilters,
  });
};
```

- [ ] Track `filter_applied` when filters change
- [ ] Test: Apply filter, verify event

---

## Phase 4: Privacy Controls (15 minutes)

### 🔲 Add Privacy Settings

Location: `src/pages/NotificationSettings.tsx` (or create privacy page)

```typescript
import { useAnalytics } from '@/lib/analytics/useAnalytics';
import { Switch } from '@/components/ui/switch';

function PrivacySettings() {
  const { optOut, optIn } = useAnalytics();
  const [enabled, setEnabled] = useState(true);
  
  const handleToggle = (checked) => {
    setEnabled(checked);
    checked ? optIn() : optOut();
  };
  
  return (
    <div>
      <Switch checked={enabled} onCheckedChange={handleToggle} />
      <p>Enable analytics to help improve the app</p>
    </div>
  );
}
```

- [ ] Add privacy toggle to settings page
- [ ] Import `useAnalytics`
- [ ] Call `optOut()` / `optIn()`
- [ ] Test: Toggle off, verify events stop
- [ ] Test: Toggle on, verify events resume

### 🔲 Add Privacy Policy

- [ ] Add text explaining what data is collected
- [ ] Explain that PII is never collected
- [ ] Link to Mixpanel privacy policy (optional)
- [ ] Explain user rights (opt-out, data erasure)

---

## Phase 5: Server-Side Tracking (Optional, 10 minutes)

Only needed if tracking sensitive events.

### 🔲 Deploy Edge Function

```bash
# Deploy function
supabase functions deploy mixpanel-proxy

# Set API secret
supabase secrets set MIXPANEL_API_SECRET=your_api_secret_here
```

- [ ] Get API secret from Mixpanel → Project Settings → Service Accounts
- [ ] Deploy function
- [ ] Set secret
- [ ] Test endpoint with curl

### 🔲 Test Server Tracking

```bash
curl -X POST \
  https://your-project.supabase.co/functions/v1/mixpanel-proxy \
  -H "Content-Type: application/json" \
  -d '{"event":"test_event","properties":{"foo":"bar"}}'
```

- [ ] Run curl command
- [ ] Should return: `{"success":true,"event":"test_event"}`
- [ ] Check Mixpanel Live View for event

---

## Phase 6: Testing (10 minutes)

### 🔲 Run Unit Tests

```bash
npm run test src/lib/analytics
```

- [ ] Run tests
- [ ] All tests should pass (14 tests)
- [ ] Fix any failures

### 🔲 Browser Testing

- [ ] Clear browser cache
- [ ] Reload app
- [ ] Open DevTools Console
- [ ] Look for analytics logs
- [ ] Interact with app (click, filter, etc.)
- [ ] Check Mixpanel Live View
- [ ] Verify all events appear

### 🔲 Opt-Out Testing

- [ ] Go to privacy settings
- [ ] Toggle analytics OFF
- [ ] Check console: should stop tracking
- [ ] Interact with app
- [ ] Verify no new events in Mixpanel
- [ ] Toggle analytics ON
- [ ] Verify tracking resumes

### 🔲 Performance Testing

```bash
npm run build
npx vite-bundle-visualizer
```

- [ ] Build app
- [ ] Check bundle size
- [ ] Verify `mixpanel-browser` is in lazy chunk (not main)
- [ ] Check network tab: Mixpanel loads after interaction

---

## Phase 7: Deployment (5 minutes)

### 🔲 Production Environment

```bash
# If using Lovable Cloud
# Add to Project Settings → Environment Variables
VITE_MIXPANEL_TOKEN=your_token_here

# If using Vercel/Netlify
# Add to dashboard Environment Variables
```

- [ ] Add `VITE_MIXPANEL_TOKEN` to production env
- [ ] Do NOT commit token to git
- [ ] Verify `.env.local` in `.gitignore`

### 🔲 Deploy

```bash
git add .
git commit -m "Add Mixpanel analytics integration"
git push
```

- [ ] Commit changes
- [ ] Push to repository
- [ ] Wait for deployment
- [ ] Test production site
- [ ] Verify events in Mixpanel

### 🔲 Monitor

- [ ] Open Mixpanel Dashboard
- [ ] Check Live View for real-time events
- [ ] Set up custom reports
- [ ] Configure alerts (optional)
- [ ] Share dashboard with team

---

## Phase 8: Documentation (5 minutes)

### 🔲 Team Onboarding

- [ ] Share `ANALYTICS_README.md` with team
- [ ] Review `docs/analytics-examples.md` for patterns
- [ ] Document any custom events added
- [ ] Add to team wiki/handbook

### 🔲 Maintenance Plan

- [ ] Schedule quarterly review of events
- [ ] Remove unused events
- [ ] Update documentation as needed
- [ ] Monitor costs (Mixpanel has free tier)

---

## ✅ Final Checklist

- [ ] Dependencies installed
- [ ] Environment variables set
- [ ] Analytics initialized in App.tsx
- [ ] Events tracked in key components
- [ ] Privacy toggle added
- [ ] Unit tests passing
- [ ] Browser testing complete
- [ ] Opt-out tested
- [ ] Performance validated
- [ ] Deployed to production
- [ ] Monitoring in Mixpanel
- [ ] Team onboarded

---

## 🎉 Done!

Once all items are checked, analytics is fully integrated.

**Time Required**: ~1-2 hours total

**Questions?** Read the documentation:
- `ANALYTICS_README.md` - Overview
- `docs/analytics-setup.md` - Setup guide
- `docs/analytics-examples.md` - Code examples
- `docs/analytics.md` - Complete reference

**Need Help?** Check troubleshooting sections in the docs.

---

**Happy tracking! 📊**


