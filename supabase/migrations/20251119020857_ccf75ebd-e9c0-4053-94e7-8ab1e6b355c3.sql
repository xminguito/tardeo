-- Crear tabla para configuración de notificaciones
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hours_before integer[] NOT NULL DEFAULT ARRAY[48, 24, 12, 6, 2],
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver la configuración
CREATE POLICY "Solo admins pueden ver configuración de notificaciones"
ON public.notification_settings
FOR SELECT
USING (is_admin(auth.uid()));

-- Solo admins pueden actualizar la configuración
CREATE POLICY "Solo admins pueden actualizar configuración de notificaciones"
ON public.notification_settings
FOR UPDATE
USING (is_admin(auth.uid()));

-- Solo admins pueden insertar configuración
CREATE POLICY "Solo admins pueden insertar configuración de notificaciones"
ON public.notification_settings
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Insertar configuración por defecto
INSERT INTO public.notification_settings (hours_before, enabled)
VALUES (ARRAY[48, 24, 12, 6, 2], true)
ON CONFLICT DO NOTHING;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();