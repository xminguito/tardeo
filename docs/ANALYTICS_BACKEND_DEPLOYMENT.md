# 🚀 Analytics Backend - Quick Deployment Guide

## ✅ What Was Implemented

### Backend (Ready to Deploy)
- ✅ SQL Migration: `supabase/migrations/20251122_create_recent_events.sql`
- ✅ Edge Function: `mixpanel-proxy` (forwards events to Mixpanel)
- ✅ Edge Function: `admin-mixpanel-query` (serves admin dashboard)
- ✅ Updated client code to use real APIs

### Frontend (Already Working)
- ✅ `serverTrack()` now uses `mixpanel-proxy` with JWT auth
- ✅ Admin dashboard uses `admin-mixpanel-query` for real data
- ✅ All mock data replaced with API calls

---

## 🏃 Quick Start (5 Minutes)

### Step 1: Run Database Migration

```bash
# Option A: Via Supabase CLI (recommended)
cd /Users/franciscojavier/Sites/tardeo
supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to https://supabase.com/dashboard
# 2. Select your project → SQL Editor
# 3. Copy/paste contents of supabase/migrations/20251122_create_recent_events.sql
# 4. Click Run
```

### Step 2: Set Mixpanel API Secret

```bash
# Get your Mixpanel API Secret:
# 1. Go to Mixpanel → Project Settings → Service Accounts
# 2. Copy the "API Secret"

# Set the secret (replace with your actual secret)
supabase secrets set MIXPANEL_API_SECRET=your_actual_secret_here
```

### Step 3: Deploy Edge Functions

```bash
# Deploy both functions
supabase functions deploy mixpanel-proxy
supabase functions deploy admin-mixpanel-query

# Verify deployment
supabase functions list
# Should show:
# - mixpanel-proxy
# - admin-mixpanel-query
```

### Step 4: Test It Works

```bash
# Test from your browser console (while logged in):
# Navigate to https://tardeo.app

# In console:
const { serverTrack } = await import('/src/lib/analytics/index.ts');
await serverTrack('test_event', { test: true });

# Should see in network tab:
# POST /functions/v1/mixpanel-proxy → 200 OK

# Check database:
# Go to Supabase Dashboard → Table Editor → recent_events
# Should see new row with event_name='test_event'
```

### Step 5: Verify Admin Dashboard

```bash
# 1. Login as admin user
# 2. Navigate to https://tardeo.app/admin/analytics
# 3. Should see:
#    - Real KPI numbers (based on recent_events)
#    - Live events stream updating every 5s
#    - Funnel with actual event counts
#    - Assistant metrics from DB
```

---

## 🔧 Configuration Reference

### Environment Variables (Auto-Set by Supabase)

These are **automatically available** in Edge Functions:
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

### Secrets You Need to Set

```bash
# Required for Mixpanel integration
supabase secrets set MIXPANEL_API_SECRET=your_secret_here

# Optional: If you need project token
supabase secrets set MIXPANEL_PROJECT_TOKEN=your_token_here
```

---

## 📊 Data Flow

### For Sensitive Events (e.g., reserve_success)

```
Client (ActivityDetail.tsx)
    ↓
serverTrack('reserve_success', {...})
    ↓
supabase.functions.invoke('mixpanel-proxy')
    ↓
Edge Function: mixpanel-proxy
    ├─→ Insert into recent_events table
    └─→ Forward to Mixpanel API (EU)
```

### For Admin Dashboard

```
Admin Dashboard (AnalyticsDashboard.tsx)
    ↓
supabase.functions.invoke('admin-mixpanel-query')
    ↓
Edge Function: admin-mixpanel-query
    ├─→ Check user is admin
    ├─→ Query recent_events table
    └─→ Return aggregated data (with caching)
```

---

## 🧪 Testing Checklist

### After Deployment

- [ ] Database migration applied successfully
- [ ] `recent_events` table exists
- [ ] Both Edge Functions deployed
- [ ] `MIXPANEL_API_SECRET` is set
- [ ] `serverTrack()` works from client (check network tab)
- [ ] Events appear in `recent_events` table
- [ ] Events appear in Mixpanel dashboard (within 1 min)
- [ ] Admin dashboard loads without errors
- [ ] Live events stream shows real events
- [ ] KPI cards show real numbers

### Test Commands

```bash
# Check migration status
supabase db diff

# View function logs
supabase functions logs mixpanel-proxy --tail
supabase functions logs admin-mixpanel-query --tail

# Query recent events
supabase db execute "SELECT * FROM recent_events ORDER BY created_at DESC LIMIT 5;"

# Test endpoint manually
curl -X POST https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/admin-mixpanel-query \
  -H "Authorization: Bearer YOUR_ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"kpi"}'
```

---

## 🐛 Common Issues & Fixes

### Issue: "Migration failed"

**Cause**: Table already exists or permission issues

**Fix**:
```sql
-- Drop and recreate (if safe)
DROP TABLE IF EXISTS recent_events CASCADE;
-- Then run migration again
```

### Issue: "Function deployment failed"

**Cause**: Missing dependencies or Deno import errors

**Fix**:
```bash
# Check Deno version
deno --version

# Redeploy with verbose logging
supabase functions deploy mixpanel-proxy --debug
```

### Issue: "serverTrack returns false"

**Cause**: User not logged in or function not deployed

**Fix**:
```typescript
// Check session first
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session); // Should have user.id

// Check function exists
supabase functions list // Should show mixpanel-proxy
```

### Issue: "Admin dashboard shows no data"

**Cause**: No events in database yet

**Fix**:
```bash
# Generate test events
# 1. Navigate app and trigger events (view activities, reserve, etc.)
# 2. Or insert manually:
supabase db execute "
  INSERT INTO recent_events (event_name, properties)
  VALUES ('test_event', '{\"test\": true}'::jsonb);
"

# Check table
supabase db execute "SELECT COUNT(*) FROM recent_events;"
```

---

## 📝 Commit Message

```bash
git add .
git commit -m "feat(analytics): add mixpanel proxy + admin query endpoints and recent_events table

- Created SQL migration for recent_events table with RLS policies
- Implemented mixpanel-proxy Edge Function for secure event forwarding
- Implemented admin-mixpanel-query Edge Function for dashboard data
- Updated serverTrack() to use mixpanel-proxy with JWT auth
- Replaced mock data in admin dashboard with real API calls
- Added comprehensive backend documentation

Backend features:
- SHA-256 hashing of user IDs for privacy
- In-memory caching with TTL for performance
- Admin-only access validation via user_roles table
- Auto-cleanup function for old events (7-day retention)
- Support for KPI, funnel, retention, assistant metrics, and live events

Status: Ready for deployment (requires MIXPANEL_API_SECRET)"
```

---

## 📚 Documentation

- **Setup Guide**: `docs/analytics-backend.md` (comprehensive)
- **Admin Dashboard**: `docs/analytics-admin.md` (UI guide)
- **This File**: Quick deployment reference

---

## 🎯 Next Steps After Deployment

1. **Monitor for 24 hours**:
   - Check function logs for errors
   - Verify events appearing in Mixpanel
   - Monitor `recent_events` table size

2. **Set up cleanup cron** (optional):
   ```sql
   -- Install pg_cron extension
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   
   -- Schedule daily cleanup at 2 AM
   SELECT cron.schedule(
     'cleanup-recent-events',
     '0 2 * * *',
     'SELECT cleanup_old_recent_events();'
   );
   ```

3. **Tune performance**:
   - Adjust cache TTLs in `admin-mixpanel-query`
   - Monitor function response times
   - Add indexes if queries are slow

4. **Production optimizations**:
   - Enable CORS for your domain only
   - Add rate limiting if needed
   - Set up monitoring/alerts

---

**Status**: ✅ **Ready to Deploy**  
**Estimated Deploy Time**: 5-10 minutes  
**Dependencies**: Supabase CLI, Mixpanel API Secret

🚀 **Let's go!**

