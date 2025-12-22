-- Create TTS monitoring logs table for detailed tracking
CREATE TABLE IF NOT EXISTS public.tts_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request metadata
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  request_id TEXT UNIQUE NOT NULL,
  
  -- TTS details
  text_input TEXT NOT NULL,
  text_length INTEGER NOT NULL,
  provider TEXT NOT NULL, -- 'ElevenLabs', 'OpenAI'
  voice_name TEXT,
  mode TEXT, -- 'brief', 'full'
  
  -- Performance metrics
  cached BOOLEAN DEFAULT false,
  cache_hit_saved_cost NUMERIC(10, 4) DEFAULT 0,
  generation_time_ms INTEGER,
  audio_duration_seconds NUMERIC(8, 2),
  
  -- Cost tracking
  estimated_cost NUMERIC(10, 4),
  actual_cost NUMERIC(10, 4),
  
  -- Status and errors
  status TEXT DEFAULT 'success', -- 'success', 'error', 'timeout'
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Metadata
  request_metadata JSONB
);

-- Create indexes for efficient queries
CREATE INDEX idx_tts_logs_created_at ON public.tts_monitoring_logs(created_at DESC);
CREATE INDEX idx_tts_logs_user_id ON public.tts_monitoring_logs(user_id);
CREATE INDEX idx_tts_logs_provider ON public.tts_monitoring_logs(provider);
CREATE INDEX idx_tts_logs_cached ON public.tts_monitoring_logs(cached);
CREATE INDEX idx_tts_logs_status ON public.tts_monitoring_logs(status);
CREATE INDEX idx_tts_logs_session_id ON public.tts_monitoring_logs(session_id);

-- Enable RLS
ALTER TABLE public.tts_monitoring_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role can manage all TTS logs"
  ON public.tts_monitoring_logs
  FOR ALL
  USING (true);

CREATE POLICY "Admins can view all TTS logs"
  ON public.tts_monitoring_logs
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Create alert thresholds configuration table
CREATE TABLE IF NOT EXISTS public.tts_alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Threshold configuration
  metric_name TEXT UNIQUE NOT NULL,
  threshold_value NUMERIC NOT NULL,
  time_window_minutes INTEGER NOT NULL,
  enabled BOOLEAN DEFAULT true,
  
  -- Alert settings
  alert_severity TEXT DEFAULT 'warning', -- 'info', 'warning', 'critical'
  notification_channels TEXT[] DEFAULT ARRAY['dashboard'], -- 'dashboard', 'email', 'slack'
  
  -- Metadata
  description TEXT,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tts_alert_thresholds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage alert thresholds"
  ON public.tts_alert_thresholds
  FOR ALL
  USING (is_admin(auth.uid()));

-- Insert default thresholds
INSERT INTO public.tts_alert_thresholds (metric_name, threshold_value, time_window_minutes, alert_severity, description)
VALUES 
  ('elevenlabs_daily_calls', 1000, 1440, 'warning', 'ElevenLabs API calls exceed 1000 per day'),
  ('daily_cost_usd', 50, 1440, 'critical', 'Daily TTS costs exceed $50'),
  ('cache_hit_rate', 30, 60, 'warning', 'Cache hit rate below 30% in last hour'),
  ('error_rate', 10, 60, 'critical', 'Error rate above 10% in last hour'),
  ('avg_generation_time_ms', 2000, 60, 'warning', 'Average generation time exceeds 2 seconds'),
  ('openai_hourly_calls', 500, 60, 'warning', 'OpenAI API calls exceed 500 per hour')
ON CONFLICT (metric_name) DO NOTHING;

-- Create alerts log table
CREATE TABLE IF NOT EXISTS public.tts_alerts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  threshold_id UUID REFERENCES public.tts_alert_thresholds(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  
  alert_severity TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  
  -- Alert metadata
  time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  affected_users_count INTEGER,
  
  -- Notification status
  notified_channels TEXT[],
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index
CREATE INDEX idx_tts_alerts_created_at ON public.tts_alerts_log(created_at DESC);
CREATE INDEX idx_tts_alerts_acknowledged ON public.tts_alerts_log(acknowledged);

-- Enable RLS
ALTER TABLE public.tts_alerts_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all alerts"
  ON public.tts_alerts_log
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can acknowledge alerts"
  ON public.tts_alerts_log
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Create materialized view for real-time aggregated metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS public.tts_monitoring_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) as time_bucket,
  provider,
  
  -- Volume metrics
  COUNT(*) as total_requests,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  
  -- Performance metrics
  AVG(text_length) as avg_text_length,
  AVG(generation_time_ms) as avg_generation_time_ms,
  AVG(audio_duration_seconds) as avg_audio_duration_seconds,
  
  -- Cache metrics
  COUNT(CASE WHEN cached THEN 1 END) as cache_hits,
  ROUND((COUNT(CASE WHEN cached THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as cache_hit_rate,
  SUM(cache_hit_saved_cost) as total_cache_savings,
  
  -- Cost metrics
  SUM(estimated_cost) as total_estimated_cost,
  SUM(actual_cost) as total_actual_cost,
  AVG(estimated_cost) as avg_cost_per_request,
  
  -- Error metrics
  COUNT(CASE WHEN status = 'error' THEN 1 END) as error_count,
  ROUND((COUNT(CASE WHEN status = 'error' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 2) as error_rate,
  
  -- Mode distribution
  COUNT(CASE WHEN mode = 'brief' THEN 1 END) as brief_mode_count,
  COUNT(CASE WHEN mode = 'full' THEN 1 END) as full_mode_count
  
FROM public.tts_monitoring_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), provider;

-- Create indexes on materialized view
CREATE INDEX idx_tts_monitoring_stats_time ON public.tts_monitoring_stats(time_bucket DESC);
CREATE INDEX idx_tts_monitoring_stats_provider ON public.tts_monitoring_stats(provider);

-- Function to refresh monitoring stats
CREATE OR REPLACE FUNCTION refresh_tts_monitoring_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.tts_monitoring_stats;
$$;

-- Function to check alert thresholds
CREATE OR REPLACE FUNCTION check_tts_alert_thresholds()
RETURNS TABLE (
  threshold_id UUID,
  metric_name TEXT,
  metric_value NUMERIC,
  threshold_value NUMERIC,
  exceeded BOOLEAN,
  alert_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  threshold_record RECORD;
  current_metric_value NUMERIC;
  time_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Loop through all enabled thresholds
  FOR threshold_record IN 
    SELECT * FROM public.tts_alert_thresholds WHERE enabled = true
  LOOP
    time_window_start := NOW() - (threshold_record.time_window_minutes || ' minutes')::INTERVAL;
    
    -- Calculate metric based on metric_name
    CASE threshold_record.metric_name
      WHEN 'elevenlabs_daily_calls' THEN
        SELECT COUNT(*) INTO current_metric_value
        FROM public.tts_monitoring_logs
        WHERE provider = 'ElevenLabs'
          AND created_at >= NOW() - INTERVAL '24 hours';
          
      WHEN 'openai_hourly_calls' THEN
        SELECT COUNT(*) INTO current_metric_value
        FROM public.tts_monitoring_logs
        WHERE provider = 'OpenAI'
          AND created_at >= NOW() - INTERVAL '1 hour';
          
      WHEN 'daily_cost_usd' THEN
        SELECT COALESCE(SUM(estimated_cost), 0) INTO current_metric_value
        FROM public.tts_monitoring_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours';
        
      WHEN 'cache_hit_rate' THEN
        SELECT COALESCE(
          (COUNT(CASE WHEN cached THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          0
        ) INTO current_metric_value
        FROM public.tts_monitoring_logs
        WHERE created_at >= time_window_start;
        
      WHEN 'error_rate' THEN
        SELECT COALESCE(
          (COUNT(CASE WHEN status = 'error' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
          0
        ) INTO current_metric_value
        FROM public.tts_monitoring_logs
        WHERE created_at >= time_window_start;
        
      WHEN 'avg_generation_time_ms' THEN
        SELECT COALESCE(AVG(generation_time_ms), 0) INTO current_metric_value
        FROM public.tts_monitoring_logs
        WHERE created_at >= time_window_start
          AND generation_time_ms IS NOT NULL;
          
      ELSE
        current_metric_value := 0;
    END CASE;
    
    -- Return the threshold check result
    threshold_id := threshold_record.id;
    metric_name := threshold_record.metric_name;
    metric_value := current_metric_value;
    threshold_value := threshold_record.threshold_value;
    
    -- Check if threshold is exceeded
    IF threshold_record.metric_name = 'cache_hit_rate' THEN
      -- For cache hit rate, alert if BELOW threshold
      exceeded := current_metric_value < threshold_record.threshold_value;
    ELSE
      -- For other metrics, alert if ABOVE threshold
      exceeded := current_metric_value > threshold_record.threshold_value;
    END IF;
    
    alert_message := threshold_record.description || 
                    ' (Current: ' || ROUND(current_metric_value, 2) || 
                    ', Threshold: ' || threshold_record.threshold_value || ')';
    
    RETURN NEXT;
  END LOOP;
END;
$$;

-- Trigger to update updated_at on thresholds
CREATE TRIGGER update_tts_alert_thresholds_updated_at
  BEFORE UPDATE ON public.tts_alert_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Comments
COMMENT ON TABLE public.tts_monitoring_logs IS 'Detailed logs of every TTS request for real-time monitoring';
COMMENT ON TABLE public.tts_alert_thresholds IS 'Configurable alert thresholds for TTS monitoring';
COMMENT ON TABLE public.tts_alerts_log IS 'Log of triggered alerts for admin review';
COMMENT ON MATERIALIZED VIEW public.tts_monitoring_stats IS 'Aggregated TTS metrics by hour and provider';
COMMENT ON FUNCTION check_tts_alert_thresholds IS 'Checks all enabled alert thresholds and returns exceeded ones';