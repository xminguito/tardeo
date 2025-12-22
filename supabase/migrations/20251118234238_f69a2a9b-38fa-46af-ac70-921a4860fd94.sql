-- Create branding bucket for corporate assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Allow public read access to branding assets
CREATE POLICY "Public read access to branding assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

-- Allow authenticated users to upload branding assets
CREATE POLICY "Authenticated users can upload branding assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding');

-- Allow authenticated users to update branding assets
CREATE POLICY "Authenticated users can update branding assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'branding');

-- Allow authenticated users to delete branding assets
CREATE POLICY "Authenticated users can delete branding assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'branding');