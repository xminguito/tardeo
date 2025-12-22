-- Add profile visibility field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS profile_visibility text DEFAULT 'public' CHECK (profile_visibility IN ('public', 'private'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON public.profiles(profile_visibility);

-- Update existing profiles to be public by default
UPDATE public.profiles SET profile_visibility = 'public' WHERE profile_visibility IS NULL;















