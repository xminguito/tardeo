-- Create system_flags table for global feature flags and circuit breakers
CREATE TABLE IF NOT EXISTS public.system_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL UNIQUE,
  flag_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system flags
CREATE POLICY "Admins can view system flags"
  ON public.system_flags
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert system flags"
  ON public.system_flags
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update system flags"
  ON public.system_flags
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete system flags"
  ON public.system_flags
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_system_flags_updated_at
  BEFORE UPDATE ON public.system_flags
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create user_tts_usage table for per-user throttling
CREATE TABLE IF NOT EXISTS public.user_tts_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  requests_last_minute INTEGER NOT NULL DEFAULT 0,
  requests_last_day INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  minute_window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  day_window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_tts_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own TTS usage"
  ON public.user_tts_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all TTS usage"
  ON public.user_tts_usage
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Service role can manage usage (for edge functions)
CREATE POLICY "Service role can manage TTS usage"
  ON public.user_tts_usage
  FOR ALL
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_user_tts_usage_updated_at
  BEFORE UPDATE ON public.user_tts_usage
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create tts_config table for global TTS configuration
CREATE TABLE IF NOT EXISTS public.tts_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tts_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage TTS config
CREATE POLICY "Admins can view TTS config"
  ON public.tts_config
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert TTS config"
  ON public.tts_config
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update TTS config"
  ON public.tts_config
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_tts_config_updated_at
  BEFORE UPDATE ON public.tts_config
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Insert default TTS configuration
INSERT INTO public.tts_config (config_key, config_value, description)
VALUES 
  ('daily_hard_cap_usd', '{"value": 50, "enabled": true}'::jsonb, 'Hard daily cost cap in USD'),
  ('per_user_limits', '{"requests_per_minute": 10, "requests_per_day": 50}'::jsonb, 'Per-user rate limits'),
  ('emergency_bitrate', '{"value": 24}'::jsonb, 'Emergency degraded bitrate in kbps'),
  ('slack_webhook_url', '{"url": ""}'::jsonb, 'Slack webhook URL for alerts'),
  ('fallback_provider', '{"provider": "openai", "voice": "shimmer"}'::jsonb, 'Fallback TTS provider when ElevenLabs is disabled')
ON CONFLICT (config_key) DO NOTHING;

-- Function to check and update user throttling
CREATE OR REPLACE FUNCTION public.check_user_tts_throttle(
  _user_id UUID,
  _max_per_minute INTEGER DEFAULT 10,
  _max_per_day INTEGER DEFAULT 50
)
RETURNS TABLE(
  allowed BOOLEAN,
  current_minute INTEGER,
  current_day INTEGER,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_record RECORD;
  now_ts TIMESTAMPTZ := now();
BEGIN
  -- Get or create usage record
  SELECT * INTO usage_record
  FROM public.user_tts_usage
  WHERE user_id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create new record
    INSERT INTO public.user_tts_usage (user_id, requests_last_minute, requests_last_day)
    VALUES (_user_id, 1, 1)
    RETURNING * INTO usage_record;
    
    RETURN QUERY SELECT true, 1, 1, 'First request'::TEXT;
    RETURN;
  END IF;

  -- Reset minute window if needed
  IF now_ts > (usage_record.minute_window_start + INTERVAL '1 minute') THEN
    usage_record.requests_last_minute := 0;
    usage_record.minute_window_start := now_ts;
  END IF;

  -- Reset day window if needed
  IF now_ts > (usage_record.day_window_start + INTERVAL '1 day') THEN
    usage_record.requests_last_day := 0;
    usage_record.day_window_start := now_ts;
  END IF;

  -- Check limits
  IF usage_record.requests_last_minute >= _max_per_minute THEN
    RETURN QUERY SELECT false, usage_record.requests_last_minute, usage_record.requests_last_day, 
      format('Rate limit exceeded: %s requests in last minute (max %s)', usage_record.requests_last_minute, _max_per_minute);
    RETURN;
  END IF;

  IF usage_record.requests_last_day >= _max_per_day THEN
    RETURN QUERY SELECT false, usage_record.requests_last_minute, usage_record.requests_last_day,
      format('Daily limit exceeded: %s requests today (max %s)', usage_record.requests_last_day, _max_per_day);
    RETURN;
  END IF;

  -- Increment counters
  UPDATE public.user_tts_usage
  SET 
    requests_last_minute = usage_record.requests_last_minute + 1,
    requests_last_day = usage_record.requests_last_day + 1,
    last_request_at = now_ts,
    minute_window_start = usage_record.minute_window_start,
    day_window_start = usage_record.day_window_start
  WHERE user_id = _user_id;

  RETURN QUERY SELECT true, 
    usage_record.requests_last_minute + 1, 
    usage_record.requests_last_day + 1, 
    'Request allowed'::TEXT;
END;
$$;

-- Add comments
COMMENT ON TABLE public.system_flags IS 'Global feature flags and circuit breakers for system control';
COMMENT ON TABLE public.user_tts_usage IS 'Per-user TTS usage tracking for rate limiting';
COMMENT ON TABLE public.tts_config IS 'Global TTS configuration including cost caps and limits';
COMMENT ON FUNCTION public.check_user_tts_throttle IS 'Check if user is allowed to make TTS request based on rate limits';