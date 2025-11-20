-- Create voice response metrics table
CREATE TABLE IF NOT EXISTS public.voice_response_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Response data
  intent TEXT NOT NULL,
  response_text TEXT NOT NULL,
  response_length INTEGER NOT NULL,
  language TEXT NOT NULL,
  
  -- Performance metrics
  tts_provider TEXT,
  cache_hit BOOLEAN DEFAULT false,
  generation_time_ms INTEGER,
  
  -- Quality feedback (optional, collected after response)
  clarity_score INTEGER CHECK (clarity_score >= 1 AND clarity_score <= 5),
  satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5),
  feedback_comment TEXT,
  feedback_submitted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_voice_metrics_created_at ON public.voice_response_metrics(created_at DESC);
CREATE INDEX idx_voice_metrics_language ON public.voice_response_metrics(language);
CREATE INDEX idx_voice_metrics_intent ON public.voice_response_metrics(intent);
CREATE INDEX idx_voice_metrics_user_id ON public.voice_response_metrics(user_id);

-- Enable RLS
ALTER TABLE public.voice_response_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own metrics"
  ON public.voice_response_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own metrics"
  ON public.voice_response_metrics
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback"
  ON public.voice_response_metrics
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics"
  ON public.voice_response_metrics
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Create materialized view for dashboard statistics (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.voice_quality_stats AS
SELECT 
  language,
  intent,
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_responses,
  AVG(response_length) as avg_response_length,
  AVG(clarity_score) as avg_clarity_score,
  AVG(satisfaction_score) as avg_satisfaction_score,
  COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hits,
  AVG(generation_time_ms) as avg_generation_time_ms,
  COUNT(CASE WHEN feedback_submitted_at IS NOT NULL THEN 1 END) as feedback_count
FROM public.voice_response_metrics
GROUP BY language, intent, DATE_TRUNC('day', created_at);

-- Create index on materialized view
CREATE INDEX idx_voice_quality_stats_date ON public.voice_quality_stats(date DESC);
CREATE INDEX idx_voice_quality_stats_language ON public.voice_quality_stats(language);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_voice_quality_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.voice_quality_stats;
$$;

COMMENT ON TABLE public.voice_response_metrics IS 'Stores voice assistant response metrics and user feedback for quality monitoring';
COMMENT ON MATERIALIZED VIEW public.voice_quality_stats IS 'Aggregated voice quality statistics by language, intent, and date';
COMMENT ON FUNCTION refresh_voice_quality_stats IS 'Refreshes the voice quality statistics materialized view';