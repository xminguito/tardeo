-- Crear tabla de favoritos
CREATE TABLE public.user_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_id)
);

-- Agregar índices para mejor rendimiento
CREATE INDEX idx_user_favorites_user_id ON public.user_favorites(user_id);
CREATE INDEX idx_user_favorites_activity_id ON public.user_favorites(activity_id);

-- Habilitar Row Level Security
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean solo sus favoritos
CREATE POLICY "Los usuarios pueden ver sus propios favoritos"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Política para que los usuarios agreguen favoritos
CREATE POLICY "Los usuarios pueden agregar favoritos"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios eliminen favoritos
CREATE POLICY "Los usuarios pueden eliminar sus favoritos"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);