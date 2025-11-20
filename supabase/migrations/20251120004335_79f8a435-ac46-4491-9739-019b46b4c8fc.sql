-- Create TTS cache table for storing generated audio
CREATE TABLE public.tts_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  voice_name TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
  bitrate INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

-- Create index on text_hash for faster cache lookups
CREATE INDEX idx_tts_cache_text_hash ON public.tts_cache(text_hash);

-- Enable RLS
ALTER TABLE public.tts_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role (edge functions) to read cache
CREATE POLICY "Service role can read TTS cache"
ON public.tts_cache
FOR SELECT
TO service_role
USING (true);

-- Policy: Allow service role (edge functions) to insert cache entries
CREATE POLICY "Service role can insert TTS cache"
ON public.tts_cache
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Allow service role (edge functions) to update cache entries
CREATE POLICY "Service role can update TTS cache"
ON public.tts_cache
FOR UPDATE
TO service_role
USING (true);

-- Policy: Allow service role (edge functions) to delete cache entries
CREATE POLICY "Service role can delete TTS cache"
ON public.tts_cache
FOR DELETE
TO service_role
USING (true);

-- No policies for authenticated or anon roles = complete client access blocked

-- Create function to cleanup expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_expired_tts_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.tts_cache
  WHERE expires_at < now();
$$;

-- Create trigger to automatically extend expires_at on access
CREATE OR REPLACE FUNCTION public.extend_tts_cache_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.expires_at = now() + INTERVAL '30 days';
  RETURN NEW;
END;
$$;

CREATE TRIGGER extend_tts_cache_expiry_trigger
BEFORE UPDATE ON public.tts_cache
FOR EACH ROW
EXECUTE FUNCTION public.extend_tts_cache_expiry();