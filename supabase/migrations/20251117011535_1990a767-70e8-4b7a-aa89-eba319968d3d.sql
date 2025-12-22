-- Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Crear tabla de roles de usuario
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Función SECURITY DEFINER para verificar roles (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Políticas RLS para user_roles
-- Los admins pueden ver todos los roles
CREATE POLICY "Admins pueden ver todos los roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Los usuarios pueden ver sus propios roles
CREATE POLICY "Usuarios pueden ver sus propios roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Solo admins pueden insertar roles
CREATE POLICY "Solo admins pueden asignar roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Solo admins pueden actualizar roles
CREATE POLICY "Solo admins pueden actualizar roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Solo admins pueden eliminar roles
CREATE POLICY "Solo admins pueden eliminar roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Comentarios para documentación
COMMENT ON TABLE public.user_roles IS 'Tabla de roles de usuario. NUNCA almacenar roles en profiles para evitar escalado de privilegios';
COMMENT ON FUNCTION public.has_role IS 'Función segura para verificar roles sin recursión RLS';
COMMENT ON FUNCTION public.is_admin IS 'Función segura para verificar si un usuario es administrador';