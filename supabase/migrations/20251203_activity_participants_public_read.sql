-- Allow public read access to activity_participants for displaying participant counts
-- This is safe because we only expose user_id, not sensitive data

-- Drop existing policy if any
DROP POLICY IF EXISTS "Anyone can view activity participants" ON public.activity_participants;

-- Create public read policy
CREATE POLICY "Anyone can view activity participants"
    ON public.activity_participants
    FOR SELECT
    USING (true);

-- Add comment for documentation
COMMENT ON POLICY "Anyone can view activity participants" ON public.activity_participants IS 
    'Allows anyone (including anonymous users) to see who is participating in activities. 
     This is intentional for social proof on activity cards.';

