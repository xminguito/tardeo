-- Crear tabla de actividades
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL,
  location text NOT NULL,
  date timestamp with time zone NOT NULL,
  max_participants integer DEFAULT 20,
  current_participants integer DEFAULT 0,
  image_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Crear tabla de participantes
CREATE TABLE IF NOT EXISTS public.activity_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(activity_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

-- Políticas para activities (lectura pública, escritura autenticada)
CREATE POLICY "Las actividades son visibles para todos"
  ON public.activities FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear actividades"
  ON public.activities FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creadores pueden actualizar sus actividades"
  ON public.activities FOR UPDATE
  USING (auth.uid() = created_by);

-- Políticas para participantes
CREATE POLICY "Los participantes son visibles para todos"
  ON public.activity_participants FOR SELECT
  USING (true);

CREATE POLICY "Usuarios pueden apuntarse a actividades"
  ON public.activity_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden desapuntarse"
  ON public.activity_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insertar algunas actividades de ejemplo
INSERT INTO public.activities (title, description, category, location, date, image_url) VALUES
('Paseo por el Retiro', 'Paseo tranquilo por el parque, disfrutando de la naturaleza y buena compañía', 'Paseos', 'Parque del Retiro, Madrid', now() + interval '2 days', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800'),
('Taller de Pintura', 'Clase de acuarela para principiantes. Todo el material incluido.', 'Arte', 'Centro Cultural, Calle Mayor 45', now() + interval '3 days', 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800'),
('Café y Tertulia', 'Encuentro informal para charlar y tomar un café', 'Social', 'Café Central, Plaza Mayor', now() + interval '1 day', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800'),
('Yoga Suave', 'Sesión de yoga adaptada para todos los niveles', 'Salud', 'Gimnasio Municipal, Calle Sol 12', now() + interval '4 days', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800');