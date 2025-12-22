-- Add latitude and longitude columns to profiles table for user base city coordinates
-- These store the user's selected home city location for distance calculations and filtering

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Add a comment to document the columns
COMMENT ON COLUMN public.profiles.latitude IS 'Latitude of user base city for location-based features';
COMMENT ON COLUMN public.profiles.longitude IS 'Longitude of user base city for location-based features';


