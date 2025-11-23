-- Fix refresh functions for materialized views
-- Change from LANGUAGE sql to LANGUAGE plpgsql to allow REFRESH MATERIALIZED VIEW

-- Drop and recreate refresh_voice_quality_stats function
DROP FUNCTION IF EXISTS public.refresh_voice_quality_stats();

CREATE OR REPLACE FUNCTION public.refresh_voice_quality_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.voice_quality_stats;
END;
$$;

-- Drop and recreate refresh_tts_monitoring_stats function
DROP FUNCTION IF EXISTS public.refresh_tts_monitoring_stats();

CREATE OR REPLACE FUNCTION public.refresh_tts_monitoring_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.tts_monitoring_stats;
END;
$$;

-- Refresh both views to populate them with current data
REFRESH MATERIALIZED VIEW public.voice_quality_stats;
REFRESH MATERIALIZED VIEW public.tts_monitoring_stats;