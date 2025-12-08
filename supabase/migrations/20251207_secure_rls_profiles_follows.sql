-- ============================================================
-- RLS Security Hardening Migration
-- Fixes: Public Scraping + Personal Info Exposure warnings
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE - Make publicly readable for SEO
-- ============================================================

-- Drop the overly restrictive authenticated-only policy
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver perfiles" ON public.profiles;

-- Create new policy: ANYONE can read profiles (needed for /u/username SEO pages)
-- This is intentional for a social app - profile pages are meant to be public
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO public
USING (true);


-- ============================================================
-- 2. FOLLOWS TABLE - Restrict to authenticated users only
-- ============================================================

-- Drop the dangerous public read policy that allows bot scraping
DROP POLICY IF EXISTS "Public follows read access" ON public.follows;

-- Create new policy: ONLY logged-in users can see social connections
-- This prevents anonymous bots from scraping follower/following lists
CREATE POLICY "Authenticated users can read follows"
ON public.follows
FOR SELECT
TO authenticated
USING (true);


-- ============================================================
-- 3. FRIENDS TABLE - Apply same pattern as follows
-- ============================================================

-- Clean up old policies
DROP POLICY IF EXISTS "Public friends read access" ON public.friends;
DROP POLICY IF EXISTS "Anyone can read friends" ON public.friends;
DROP POLICY IF EXISTS "Users can insert friendships" ON public.friends;
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friends;
DROP POLICY IF EXISTS "Users can update their own friendships" ON public.friends;

-- Only authenticated users can see friend connections
CREATE POLICY "Authenticated users can read friends"
ON public.friends
FOR SELECT
TO authenticated
USING (true);

-- Users can send friend requests
DROP POLICY IF EXISTS "Users can create friend requests" ON public.friends;
CREATE POLICY "Users can create friend requests"
ON public.friends
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their friend requests (accept/block)
DROP POLICY IF EXISTS "Users can update own friend requests" ON public.friends;
CREATE POLICY "Users can update own friend requests"
ON public.friends
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can delete their friend connections
DROP POLICY IF EXISTS "Users can delete own friend connections" ON public.friends;
CREATE POLICY "Users can delete own friend connections"
ON public.friends
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = friend_id);


-- ============================================================
-- 4. NOTIFICATIONS TABLE - Already secured (verification only)
-- ============================================================
-- SELECT: auth.uid() = user_id ✓
-- UPDATE: auth.uid() = user_id ✓
-- No changes needed
