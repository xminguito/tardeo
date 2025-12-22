-- Crear cron job para verificar actividades favoritas próximas
-- Se ejecuta diariamente a las 9:00 AM
SELECT cron.schedule(
  'check-upcoming-favorites-daily',
  '0 9 * * *',
  $$
  select
    net.http_post(
        url:='https://kzcowengsnnuglyrjuto.supabase.co/functions/v1/check-upcoming-favorites',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y293ZW5nc25udWdseXJqdXRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjkyNTAsImV4cCI6MjA3Njc0NTI1MH0.ZwhhjRJgTKl3NQuTXy0unk2DFIDDjxi7T4zLN8EVyi0"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);