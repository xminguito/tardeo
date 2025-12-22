-- Crear cron job para verificar actividades favoritas próximas
-- Se ejecuta diariamente a las 9:00 AM
-- Nota: La Edge Function tiene verify_jwt: false, no requiere Authorization header
SELECT cron.schedule(
  'check-upcoming-favorites-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/check-upcoming-favorites',
    headers:='{"Content-Type": "application/json"}'::jsonb,
    body:='{"source": "cron"}'::jsonb
  ) as request_id;
  $$
);