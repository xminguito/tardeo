# Mixpanel Analytics Dashboard - Known Issues

## Issue: Mixpanel API Authentication Failing

### Problem

The Analytics Dashboard (`/admin/analytics`) is currently showing data from
Supabase `recent_events` table instead of Mixpanel's full historical data
because Mixpanel API authentication is failing.

### Symptoms

- Dashboard shows "2 DAU / 2 WAU" from local `recent_events` table
- Mixpanel dashboard shows "7 DAU / 22 WAU" (correct full historical data)
- Edge Function logs show: `Authentication required` errors from Mixpanel API

### Credentials Tested

All of the following configurations were tested and failed with
`AuthenticationRequired`:

1. Project Token: `984ef6d1b18b5a90a107e8bdc1352d77` ❌
2. Project Secret: `841e185fec7dea687d746e23b00e6abf` ❌
3. Service Account Secret: `W5eLK6t1Tpn00nIkvnSaiMjfMtnQAd6g` ❌
4. Service Account Full:
   `Tardeo.44e6eb.mp-service-account:W5eLK6t1Tpn00nIkvnSaiMjfMtnQAd6g` ❌

### APIs Attempted

- Mixpanel JQL API (`/api/2.0/jql`) ❌
- Mixpanel Insights API (`/api/2.0/insights`) ❌
- Mixpanel Segmentation API (`/api/2.0/segmentation`) ❌

All return XML error: `<Error><Code>AuthenticationRequired</Code></Error>`

### Current Workaround

The system falls back to querying the `recent_events` table in Supabase, which
contains events from the last few days. This provides partial analytics but not
full historical data from Mixpanel.

### Next Steps

1. **Contact Mixpanel Support** to verify:
   - Correct authentication method for EU region (`api-eu.mixpanel.com`)
   - Required permissions for Service Account
   - Whether Query API access is enabled for the project

2. **Verify Access** in Mixpanel Dashboard:
   - Go to Project Settings → Access Keys
   - Confirm the Service Account has "Read" permissions
   - Check if there are any IP restrictions

3. **Alternative**: Consider using Mixpanel's **Data Pipelines** or **Warehouse
   Connectors** to sync data to Supabase for querying

### Files Modified

- `/supabase/functions/admin-mixpanel-query/index.ts` - Added fallback logic
  with `_dataSource` indicator
- Metrics now include `_dataSource: 'supabase_fallback'` when Mixpanel fails

### Impact

- ✅ Events are being sent to Mixpanel correctly (via `/track` endpoint)
- ✅ Dashboard shows accurate data for recent events (from Supabase)
- ❌ Dashboard cannot show full historical analytics from Mixpanel
- ❌ Some advanced Mixpanel features (funnels, retention) unavailable

### Priority

**Medium** - Analytics are working but with limited historical data. Not
blocking core functionality.
