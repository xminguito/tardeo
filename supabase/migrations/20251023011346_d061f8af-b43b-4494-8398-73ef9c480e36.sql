-- Crear tabla de perfiles de usuarios
CREATE TABLE public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  bio text,
  avatar_url text,
  birth_date date,
  city text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para perfiles
CREATE POLICY "Los perfiles son visibles para todos"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios pueden crear su propio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$;

-- Trigger para crear perfil automáticamente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Tabla de intereses
CREATE TABLE public.interests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS para intereses
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los intereses son visibles para todos"
  ON public.interests FOR SELECT
  USING (true);

-- Tabla de relación usuario-intereses
CREATE TABLE public.user_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

-- RLS para user_interests
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los intereses de usuarios son visibles para todos"
  ON public.user_interests FOR SELECT
  USING (true);

CREATE POLICY "Los usuarios pueden gestionar sus propios intereses"
  ON public.user_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios intereses"
  ON public.user_interests FOR DELETE
  USING (auth.uid() = user_id);

-- Tabla de notificaciones
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'reminder', 'birthday', 'motivational', 'activity'
  activity_id uuid REFERENCES public.activities(id) ON DELETE CASCADE,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- RLS para notificaciones
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propias notificaciones"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias notificaciones"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Insertar algunos intereses por defecto
INSERT INTO public.interests (name, icon) VALUES
  ('Paseos', '🌳'),
  ('Café y conversación', '☕'),
  ('Juegos de mesa', '🎲'),
  ('Baile', '💃'),
  ('Lectura', '📚'),
  ('Arte', '🎨'),
  ('Música', '🎵'),
  ('Cocina', '👨‍🍳'),
  ('Jardinería', '🌺'),
  ('Fotografía', '📷'),
  ('Yoga', '🧘'),
  ('Senderismo', '⛰️');