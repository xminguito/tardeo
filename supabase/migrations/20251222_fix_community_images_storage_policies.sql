-- ============================================================
-- Migration: Fix Community Images Storage Policies
-- ============================================================
--
-- PROBLEM:
-- Current policies use user_id in folder structure:
--   community_images/{user_id}/{filename}
-- 
-- This means:
-- - Only the uploader can UPDATE/DELETE images
-- - Other community admins/moderators cannot manage images
-- - If the uploader leaves the community, images become unmanageable
--
-- SOLUTION:
-- Change folder structure to:
--   community_images/{community_id}/{filename}
--
-- And verify user has admin/moderator role in the community
--
-- ============================================================

-- ============================================================
-- 1. Create helper function in PUBLIC schema
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_community_admin_or_moderator(
  community_uuid uuid,
  user_uuid uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE community_id = community_uuid
      AND user_id = user_uuid
      AND role IN ('admin', 'moderator')
  );
END;
$$;

-- Grant execute to users
GRANT EXECUTE ON FUNCTION public.is_community_admin_or_moderator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_admin_or_moderator(uuid, uuid) TO anon;

-- ============================================================
-- 2. Drop existing community_images policies
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view community images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own community images" ON storage.objects;

-- ============================================================
-- 3. Create new policies with community-based authorization
-- ============================================================

-- SELECT: Public read access (unchanged behavior)
CREATE POLICY "Anyone can view community images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community_images');

-- INSERT: Community admins/moderators can upload images
-- Folder structure: community_images/{community_id}/{filename}
CREATE POLICY "Community admins can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community_images'
  AND public.is_community_admin_or_moderator(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg', 'jpeg', 'png', 'webp', 'gif'])
);

-- UPDATE: Community admins/moderators can update images
CREATE POLICY "Community admins can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'community_images'
  AND public.is_community_admin_or_moderator(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'community_images'
  AND public.is_community_admin_or_moderator(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
);

-- DELETE: Community admins/moderators can delete images
CREATE POLICY "Community admins can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community_images'
  AND public.is_community_admin_or_moderator(
    (storage.foldername(name))[1]::uuid,
    auth.uid()
  )
);

-- ============================================================
-- 4. Add helpful comments
-- ============================================================

COMMENT ON FUNCTION public.is_community_admin_or_moderator IS 
'Helper function to check if a user has admin or moderator role in a community.
Used by storage policies to authorize community image management.';

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
--
-- FOLDER STRUCTURE CHANGE:
-- OLD: community_images/{user_id}/{filename}
-- NEW: community_images/{community_id}/{filename}
--
-- FRONTEND FLOW CHANGE:
-- OLD: Upload image → Create community
-- NEW: Create community → Upload image → Update community with URL
--
-- See: src/features/communities/hooks/useCommunityCreation.ts
--
-- ============================================================
