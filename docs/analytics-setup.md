# Analytics Setup Guide

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install mixpanel-browser
npm install -D @types/mixpanel-browser vitest
```

### 2. Configure Environment Variables

Create or update `.env.local`:

```env
# Mixpanel Token (get from Mixpanel Dashboard → Project Settings)
VITE_MIXPANEL_TOKEN=__REDACTED__

# Supabase URL (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
```

**⚠️ IMPORTANT**: Never commit real tokens to git!

### 3. Deploy Supabase Edge Function

```bash
# Deploy the proxy function
supabase functions deploy mixpanel-proxy

# Set the API secret (get from Mixpanel → Project Settings → Service Accounts)
supabase secrets set MIXPANEL_API_SECRET=your_api_secret_here
```

### 4. Initialize in Your App

Edit `src/App.tsx`:

```typescript
import { useEffect } from 'react';
import { initAnalytics, track } from '@/lib/analytics';

function App() {
  useEffect(() => {
    // Initialize analytics (lazy loads after interaction)
    initAnalytics().catch(console.error);
    
    // Track app open
    track('app_opened', {});
  }, []);
  
  return (
    <div>
      {/* Your app */}
    </div>
  );
}
```

### 5. Test Locally

```bash
# Run dev server
npm run dev

# Open browser console
# Look for:
# [Analytics] Mixpanel initialized successfully
# [Analytics] Tracked: app_opened { ... }

# Visit Mixpanel → Live View to see events
```

---

## Getting Mixpanel Tokens

### Client Token (VITE_MIXPANEL_TOKEN)

1. Go to [Mixpanel Dashboard](https://mixpanel.com/)
2. Select your project
3. Click Settings → Project Settings
4. Copy **Project Token**
5. Add to `.env.local` as `VITE_MIXPANEL_TOKEN`

### API Secret (MIXPANEL_API_SECRET)

1. Go to [Mixpanel Dashboard](https://mixpanel.com/)
2. Select your project
3. Click Settings → Project Settings
4. Scroll to **Service Accounts**
5. Create or copy existing Service Account secret
6. Set in Supabase: `supabase secrets set MIXPANEL_API_SECRET=xxx`

---

## File Structure (Already Created)

```
src/lib/analytics/
├── index.ts                      # Main API (initAnalytics, track, etc.)
├── types.ts                      # TypeScript types
├── mixpanel.client.ts            # Dynamic Mixpanel loader
├── useAnalytics.ts               # React hook
└── __tests__/
    └── analytics.test.ts         # Unit tests

supabase/functions/
└── mixpanel-proxy/
    └── index.ts                  # Server-side tracking

docs/
├── analytics.md                  # Complete documentation
├── analytics-examples.md         # Usage examples
└── analytics-setup.md            # This file
```

---

## Environment Variables Checklist

### Local Development (.env.local)

```env
✅ VITE_MIXPANEL_TOKEN=your_project_token
✅ VITE_SUPABASE_URL=https://xxx.supabase.co
```

### Supabase Production (via Dashboard or CLI)

```bash
✅ supabase secrets set MIXPANEL_API_SECRET=your_api_secret
```

### Lovable Cloud (if using)

Add via Lovable Dashboard → Project Settings → Environment Variables:

```env
VITE_MIXPANEL_TOKEN=your_project_token
```

---

## Testing

### Run Unit Tests

```bash
npm run test src/lib/analytics
```

Expected output:
```
✓ Analytics Queue Behavior (3 tests)
✓ Opt-Out Toggle (4 tests)
✓ PII Hashing (4 tests)
✓ Rate Limiting (1 test)
✓ Default Metadata (2 tests)
```

### Test in Browser

1. Open Dev Tools → Console
2. Run:
```javascript
// Import functions
import { track, getAnalyticsStatus } from '/src/lib/analytics/index.ts';

// Check status
console.log(getAnalyticsStatus());
// Should show: { initialized: true, queueLength: 0, disabled: false }

// Track test event
track('test_event', { foo: 'bar' });

// Check Mixpanel Live View
```

3. Go to Mixpanel → Live View
4. Should see `test_event` appear

---

## Deployment

### Deploy to Lovable Cloud

```bash
# Commit changes
git add .
git commit -m "Add Mixpanel analytics"
git push

# Lovable will auto-deploy
# Add env vars via Lovable Dashboard
```

### Deploy Edge Function

```bash
# Ensure you're logged in to Supabase
supabase login

# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy mixpanel-proxy

# Set secret
supabase secrets set MIXPANEL_API_SECRET=xxx

# Test endpoint
curl -X POST \
  https://your-project.supabase.co/functions/v1/mixpanel-proxy \
  -H "Content-Type: application/json" \
  -d '{"event":"test_event","properties":{"foo":"bar"}}'

# Should return: {"success":true,"event":"test_event"}
```

---

## Verification Checklist

After deployment, verify:

- [ ] Analytics loads without blocking page load
- [ ] Events appear in Mixpanel Live View
- [ ] PII is hashed (check console logs)
- [ ] Opt-out works (toggle in settings)
- [ ] Server-side events work (test reservation)
- [ ] No errors in browser console
- [ ] No errors in Supabase function logs

---

## Troubleshooting

### Issue: "Analytics not initialized"

**Solution**: Check token is set:
```bash
echo $VITE_MIXPANEL_TOKEN
```

If empty, add to `.env.local` and restart dev server.

---

### Issue: "Failed to track event"

**Possible causes**:
1. Token is invalid → Check Mixpanel Dashboard
2. Analytics opted out → Check `localStorage.getItem('analytics_opt_out')`
3. Network issue → Check browser Network tab

---

### Issue: "Server-track failing"

**Check**:
1. Edge function deployed: `supabase functions list`
2. Secret set: `supabase secrets list`
3. Function logs: `supabase functions logs mixpanel-proxy`

**Debug**:
```bash
# Test function directly
curl -X POST \
  https://your-project.supabase.co/functions/v1/mixpanel-proxy \
  -H "Content-Type: application/json" \
  -d '{"event":"test","properties":{}}'
```

---

### Issue: "Events not appearing in Mixpanel"

**Check**:
1. Correct project selected in Mixpanel
2. Token matches project
3. Events sent (check browser console for `[Analytics] Tracked:`)
4. Mixpanel Live View is open (events are real-time)

---

## Performance Validation

After setup, validate performance:

### 1. Check Initial Bundle Size

```bash
npm run build
npx vite-bundle-visualizer
```

**Expected**: `mixpanel-browser` should NOT be in initial bundle.

### 2. Check Load Timing

1. Open DevTools → Network tab
2. Reload page
3. `mixpanel-browser` should load AFTER user interaction or 2s

### 3. Check Memory Usage

```javascript
// Before analytics
console.memory.usedJSHeapSize;

// After analytics
console.memory.usedJSHeapSize;

// Should be < 2MB increase
```

---

## Security Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] Never commit real tokens
- [ ] `MIXPANEL_API_SECRET` only in Supabase secrets (never in code)
- [ ] PII hashing enabled (automatic)
- [ ] IP tracking disabled (check `mixpanel.client.ts`)
- [ ] User can opt-out (privacy settings page)

---

## Next Steps

1. ✅ Setup complete
2. ✅ Test locally
3. ✅ Deploy to production
4. → Add analytics to components (see `analytics-examples.md`)
5. → Monitor events in Mixpanel Dashboard
6. → Set up custom reports
7. → Configure retention cohorts
8. → Set up alerts for key metrics

---

## Support

**Documentation**:
- Main docs: `docs/analytics.md`
- Examples: `docs/analytics-examples.md`
- This file: `docs/analytics-setup.md`

**Mixpanel Resources**:
- [Mixpanel Docs](https://docs.mixpanel.com/)
- [JavaScript SDK](https://github.com/mixpanel/mixpanel-js)
- [API Reference](https://developer.mixpanel.com/reference/overview)

**Issues?**
1. Check troubleshooting section above
2. Review browser console logs
3. Check Supabase function logs
4. Test with `curl` commands

---

**Setup complete! 🎉** Start tracking events in your components.


