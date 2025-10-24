-- Create activity_ratings table
CREATE TABLE public.activity_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(activity_id, user_id)
);

-- Add indices for performance
CREATE INDEX idx_activity_ratings_activity_id ON public.activity_ratings(activity_id);
CREATE INDEX idx_activity_ratings_user_id ON public.activity_ratings(user_id);
CREATE INDEX idx_activity_ratings_created_at ON public.activity_ratings(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Las valoraciones son visibles para todos"
ON public.activity_ratings
FOR SELECT
USING (true);

CREATE POLICY "Usuarios autenticados pueden crear valoraciones"
ON public.activity_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus propias valoraciones"
ON public.activity_ratings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propias valoraciones"
ON public.activity_ratings
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_activity_ratings_updated_at
BEFORE UPDATE ON public.activity_ratings
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();