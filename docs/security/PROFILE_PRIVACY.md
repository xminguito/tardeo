# Profile Privacy & Data Security

## Overview

This document outlines the security measures implemented to protect user privacy while maintaining SEO-friendly public profiles.

## Problem Statement

Previously, the `profiles` table had a public RLS policy allowing `SELECT` access to **ALL** columns, exposing sensitive user data:

| Column | Sensitivity | Risk |
|--------|-------------|------|
| `latitude`, `longitude` | 🔴 **CRITICAL** | Exact GPS coordinates enable physical tracking |
| `birth_date` | 🟠 **HIGH** | Full date of birth for identity theft |
| `last_seen_at` | 🟠 **HIGH** | Precise activity tracking/stalking |
| `is_online` | 🟡 **MEDIUM** | Real-time presence monitoring |

## Solution: `public_profiles` View

We implemented a **security view** that exposes only safe data for public consumption.

### Architecture

```
┌─────────────────────────────────────────┐
│          profiles (table)               │
│  ✅ Full data with restrictive RLS      │
│  - authenticated users only             │
│  - users can see own profile            │
└─────────────────────────────────────────┘
                   │
                   │ Powers
                   ▼
┌─────────────────────────────────────────┐
│       public_profiles (view)            │
│  ✅ Safe subset of data                 │
│  - NO GPS coordinates                   │
│  - NO exact birth_date (only age)       │
│  - NO precise last_seen_at              │
│  ✅ Public read access (anon + auth)    │
└─────────────────────────────────────────┘
```

### Safe Columns Exposed

The `public_profiles` view includes:

**User Identity:**
- `id` (UUID)
- `username`
- `full_name`
- `avatar_url`
- `bio`

**Public Metadata:**
- `city` (general location, not precise coordinates)
- `gallery_images`
- `following_count`, `followers_count`, `friends_count`
- `profile_visibility`
- `created_at`, `updated_at`
- `onboarding_completed`

**Computed Safe Fields:**
- `age` (integer) - derived from `birth_date` without exposing the exact date
- `is_recently_active` (boolean) - shows if user was active in last 15 minutes (not exact timestamp)

### Excluded Sensitive Data

❌ **Not included in public view:**
- `latitude`, `longitude` - GPS coordinates
- `birth_date` - Exact date of birth
- `last_seen_at` - Precise activity timestamp
- `is_online` - Real-time status (replaced with `is_recently_active`)
- `voice_status` - Internal settings

## Frontend Implementation

### When to Use Each Source

| Use Case | Source | Rationale |
|----------|--------|-----------|
| `/u/username` public pages | `public_profiles` | SEO-friendly, safe for anonymous users |
| Explore profiles | `public_profiles` | Prevents scraping of sensitive data |
| Global search | `public_profiles` | Public discovery feature |
| Own profile edit | `profiles` | User needs full access to their own data |
| Authenticated profile view | `profiles` | Friends/followers may see more details |

### Code Examples

**Public Profile Lookup (ExploreProfiles):**
```typescript
const { data: profiles } = await supabase
  .from("public_profiles") // ✅ Use view
  .select("*")
  .order("created_at", { ascending: false });
```

**Own Profile Edit (Profile.tsx):**
```typescript
const { data: profile } = await supabase
  .from("profiles") // ✅ Use table (RLS checks auth)
  .select("*")
  .eq("id", user.id)
  .single();
```

**Smart Profile Hook (useSocialProfile):**
```typescript
const tableName = user && isOwnProfile 
  ? "profiles"         // ✅ Own profile: full data
  : "public_profiles"; // ✅ Public view: safe subset
```

## Security Benefits

1. **Anti-Scraping**: Bots cannot harvest GPS coordinates or precise activity patterns
2. **Privacy Compliance**: Aligns with GDPR/CCPA principles (data minimization)
3. **Stalking Prevention**: Real-time location and activity data is hidden
4. **Identity Protection**: Exact birth dates are not exposed
5. **SEO Maintained**: Public profiles remain crawlable for search engines

## RLS Policies

### `profiles` Table

```sql
-- Only authenticated users can read full profiles
CREATE POLICY "Authenticated users can read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Users can always read their own profile
CREATE POLICY "Users can read own profile"
ON public.profiles FOR SELECT TO public
USING (auth.uid() = id);
```

### `public_profiles` View

```sql
-- Public read access (no RLS needed, view filters data)
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;
```

## Migration

Applied via: `supabase/migrations/20251222_create_public_profiles_view.sql`

**Steps:**
1. Dropped dangerous public SELECT policy on `profiles`
2. Created restrictive RLS for authenticated users
3. Created `public_profiles` view with safe columns only
4. Updated frontend queries to use view where appropriate
5. Regenerated TypeScript types

## Monitoring

To verify security:

```sql
-- Check what columns are exposed publicly
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'public_profiles';

-- Verify RLS policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';
```

## Future Considerations

- Consider adding user-controlled privacy settings (who can see `city`, etc.)
- Implement rate limiting on profile searches to prevent scraping
- Add audit logging for profile access patterns
- Consider geohashing city coordinates for privacy-preserving proximity

---

**Last Updated:** 2025-12-22  
**Migration:** `20251222_create_public_profiles_view.sql`
