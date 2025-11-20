-- Create storage bucket for TTS audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tts-audio',
  'tts-audio',
  true,
  5242880, -- 5MB limit per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for tts-audio bucket
-- Allow public read access (audio files are served to users)
CREATE POLICY "Public read access for TTS audio"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tts-audio');

-- Only service role can upload TTS files (from edge function)
CREATE POLICY "Service role can upload TTS audio"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tts-audio' 
  AND auth.role() = 'service_role'
);

-- Only service role can delete TTS files (cleanup)
CREATE POLICY "Service role can delete TTS audio"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'tts-audio' 
  AND auth.role() = 'service_role'
);