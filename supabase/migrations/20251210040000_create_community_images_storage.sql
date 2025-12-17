-- ============================================================
-- STORAGE BUCKET FOR COMMUNITY IMAGES
-- Purpose: Allow users to upload cover/avatar images for communities
-- ============================================================

-- ============================================================
-- 1. CREATE STORAGE BUCKET
-- ============================================================

-- Insert bucket (idempotent - will skip if exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('community_images', 'community_images', true)
ON CONFLICT (id) DO NOTHING;

-- Add comment
COMMENT ON TABLE storage.buckets IS 'Storage bucket for community cover and avatar images';


-- ============================================================
-- 2. STORAGE POLICIES - Security Rules
-- ============================================================

-- DROP existing policies if any (for idempotency)
DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community images" ON storage.objects;

-- SELECT: Public read access (everyone can view images)
CREATE POLICY "Anyone can view community images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community_images');

-- INSERT: Authenticated users can upload (with file restrictions)
CREATE POLICY "Authenticated users can upload community images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community_images'
  AND (storage.foldername(name))[1] = auth.uid()::text -- Files must be in user's folder
  AND LOWER((storage.extension(name))) IN ('jpg', 'jpeg', 'png', 'webp', 'gif') -- Only images
);

-- UPDATE: Users can update their own images
CREATE POLICY "Users can update their own community images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'community_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Users can delete their own images
CREATE POLICY "Users can delete their own community images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community_images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- 3. HELPER FUNCTION - Check slug uniqueness
-- ============================================================

-- Function to check if a community slug is available
CREATE OR REPLACE FUNCTION is_community_slug_available(slug_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.communities WHERE slug = slug_to_check
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_community_slug_available IS 'Check if a community slug is available for use';


-- ============================================================
-- MIGRATION COMPLETE ✅
-- ============================================================

-- Verification query (run after migration):
-- SELECT * FROM storage.buckets WHERE id = 'community_images';
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%community%';
