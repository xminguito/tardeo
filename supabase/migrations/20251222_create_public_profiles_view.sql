-- ============================================================
-- Security Migration: Public Profiles View
-- ============================================================
-- 
-- PROBLEM:
-- The current RLS policy "Public profiles are viewable by everyone" 
-- exposes ALL columns including:
--   - latitude, longitude (exact GPS coordinates)
--   - birth_date (full date of birth)
--   - last_seen_at (activity tracking)
--   - is_online (real-time stalking)
--
-- SOLUTION:
-- Create a public VIEW that exposes ONLY safe columns for SEO
-- and public profile pages (/u/username)
--
-- ============================================================

-- ============================================================
-- 1. Drop the dangerous public SELECT policy
-- ============================================================

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- ============================================================
-- 2. Create restrictive RLS: Only authenticated users can read full profiles
-- ============================================================

CREATE POLICY "Authenticated users can read profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Users can still read their own profile even if not authenticated
-- (for edge cases during onboarding)
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
TO public
USING (auth.uid() = id);

-- ============================================================
-- 3. Create Public Profiles View (Safe for SEO)
-- ============================================================

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT
  id,
  username,
  full_name,
  bio,
  avatar_url,
  city,                    -- City is OK (not precise location)
  gallery_images,
  following_count,
  followers_count,
  friends_count,
  profile_visibility,
  created_at,
  updated_at,
  onboarding_completed,
  
  -- Computed: Show ONLY if birth_date exists (for age display)
  -- but NOT the exact date
  CASE 
    WHEN birth_date IS NOT NULL THEN 
      EXTRACT(YEAR FROM AGE(birth_date))::integer
    ELSE NULL
  END AS age,
  
  -- Privacy-respecting online indicator (show only "recently active" status)
  CASE
    WHEN is_online = true THEN true
    WHEN last_seen_at > NOW() - INTERVAL '15 minutes' THEN true
    ELSE false
  END AS is_recently_active

FROM public.profiles

-- ONLY show profiles that are marked as public
WHERE profile_visibility = 'public';

-- Grant public read access to the VIEW
GRANT SELECT ON public.public_profiles TO anon;
GRANT SELECT ON public.public_profiles TO authenticated;

-- ============================================================
-- 4. Add helpful comment for future developers
-- ============================================================

COMMENT ON VIEW public.public_profiles IS 
'Public-safe view of user profiles. Excludes sensitive data like GPS coordinates, 
exact birth dates, and precise last_seen timestamps. Use this for SEO pages 
and unauthenticated profile views.';

-- ============================================================
-- 5. Create index on username for fast /u/username lookups
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username_public 
ON public.profiles(username) 
WHERE profile_visibility = 'public';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
-- 
-- Next steps:
-- 1. Update frontend queries for /u/username pages to use public_profiles view
-- 2. Keep authenticated profile queries using profiles table
-- 3. Monitor analytics for any broken queries
--
-- ============================================================
