-- Migration: Add mobile image support to hero_banners
-- Description: Adds image_url_mobile column for responsive image optimization
-- Date: 2025-11-24

ALTER TABLE hero_banners 
ADD COLUMN IF NOT EXISTS image_url_mobile TEXT;

COMMENT ON COLUMN hero_banners.image_url_mobile IS 
  'Optional mobile-optimized image URL. Falls back to image_url if not provided. Recommended: 800x1200px for portrait mobile displays.';
