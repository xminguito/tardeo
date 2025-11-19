-- Añadir campo para configurar el intervalo del cron
ALTER TABLE public.notification_settings
ADD COLUMN cron_interval_minutes integer NOT NULL DEFAULT 60;

COMMENT ON COLUMN public.notification_settings.cron_interval_minutes IS 'Intervalo en minutos entre ejecuciones del cron job (ej: 5, 15, 30, 60)';