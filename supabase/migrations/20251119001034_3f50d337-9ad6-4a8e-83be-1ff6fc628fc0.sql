-- Add structured location fields to activities table
ALTER TABLE public.activities
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'España',
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Add index for faster location queries
CREATE INDEX IF NOT EXISTS idx_activities_city ON public.activities(city);
CREATE INDEX IF NOT EXISTS idx_activities_coordinates ON public.activities(latitude, longitude);

-- Add comment for documentation
COMMENT ON COLUMN public.activities.city IS 'City where the activity takes place';
COMMENT ON COLUMN public.activities.province IS 'Province/Region where the activity takes place';
COMMENT ON COLUMN public.activities.country IS 'Country where the activity takes place';
COMMENT ON COLUMN public.activities.latitude IS 'Latitude coordinate for distance calculations';
COMMENT ON COLUMN public.activities.longitude IS 'Longitude coordinate for distance calculations';