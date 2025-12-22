-- =====================================================
-- Dynamic Pages CMS Table
-- Migration: create_pages_table
-- =====================================================

-- Create the pages table
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT, -- HTML content from rich text editor
  featured_image TEXT, -- URL for hero image
  meta_description TEXT, -- SEO meta description
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for documentation
COMMENT ON TABLE public.pages IS 'CMS Pages for dynamic content like Privacy Policy, Terms, etc.';
COMMENT ON COLUMN public.pages.slug IS 'URL slug (e.g., privacidad, terminos). Must be unique.';
COMMENT ON COLUMN public.pages.content IS 'HTML content from TipTap rich text editor';
COMMENT ON COLUMN public.pages.featured_image IS 'Optional hero image URL';
COMMENT ON COLUMN public.pages.is_published IS 'Only published pages are visible to the public';

-- Create index for slug lookups (critical for public page loading)
CREATE INDEX IF NOT EXISTS idx_pages_slug ON public.pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_published ON public.pages(is_published) WHERE is_published = true;

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_pages_updated_at ON public.pages;
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- Row Level Security (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;

-- Policy: Public can read published pages
CREATE POLICY "Public read access for published pages"
  ON public.pages
  FOR SELECT
  USING (is_published = true);

-- Policy: Admins have full access
-- Admins are identified by role = 'admin' in user_roles table
CREATE POLICY "Admin full access"
  ON public.pages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT ON public.pages TO anon;
GRANT SELECT ON public.pages TO authenticated;
GRANT ALL ON public.pages TO authenticated;
