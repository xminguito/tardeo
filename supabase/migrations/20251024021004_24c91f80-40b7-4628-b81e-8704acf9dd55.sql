-- Add explicit foreign keys for joining profiles and activities
ALTER TABLE public.activity_ratings
  ADD CONSTRAINT activity_ratings_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT activity_ratings_activity_id_fkey
    FOREIGN KEY (activity_id) REFERENCES public.activities(id) ON DELETE CASCADE;