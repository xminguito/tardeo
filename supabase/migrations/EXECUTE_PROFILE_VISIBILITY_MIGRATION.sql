-- ============================================
-- PROFILE VISIBILITY MIGRATION
-- Execute this in Supabase Dashboard SQL Editor
-- ============================================

-- Add profile visibility field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON public.profiles(profile_visibility);

-- Update existing profiles to be public by default
UPDATE public.profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL;

-- ============================================
-- VERIFICATION QUERIES (run separately)
-- ============================================

-- Verify column exists:
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'profiles' 
--   AND column_name = 'profile_visibility';

-- Verify index exists:
-- SELECT indexname FROM pg_indexes 
-- WHERE schemaname = 'public' AND tablename = 'profiles' 
--   AND indexname = 'idx_profiles_visibility';

