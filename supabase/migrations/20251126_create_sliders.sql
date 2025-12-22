-- Migration: Multiple Sliders System
-- Run this in Supabase SQL Editor

-- 1. Create sliders table
CREATE TABLE IF NOT EXISTS public.sliders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  page_path TEXT NOT NULL DEFAULT '/',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add slider_id column to hero_banners
ALTER TABLE public.hero_banners 
ADD COLUMN IF NOT EXISTS slider_id UUID REFERENCES public.sliders(id) ON DELETE SET NULL;

-- 3. Create default "Home" slider
INSERT INTO public.sliders (name, slug, description, page_path, is_active)
VALUES ('Slider Principal', 'home', 'Slider de la página principal', '/', true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Associate existing banners to the home slider
UPDATE public.hero_banners 
SET slider_id = (SELECT id FROM public.sliders WHERE slug = 'home')
WHERE slider_id IS NULL;

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_hero_banners_slider_id ON public.hero_banners(slider_id);
CREATE INDEX IF NOT EXISTS idx_sliders_page_path ON public.sliders(page_path);
CREATE INDEX IF NOT EXISTS idx_sliders_slug ON public.sliders(slug);

-- 6. Enable RLS
ALTER TABLE public.sliders ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for sliders
-- Public read
CREATE POLICY "Anyone can view active sliders" ON public.sliders
  FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage sliders" ON public.sliders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_sliders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_sliders_updated_at ON public.sliders;
CREATE TRIGGER update_sliders_updated_at
  BEFORE UPDATE ON public.sliders
  FOR EACH ROW
  EXECUTE FUNCTION update_sliders_updated_at();

-- 9. Insert some example sliders (optional)
INSERT INTO public.sliders (name, slug, description, page_path, is_active)
VALUES 
  ('Slider Actividades', 'actividades', 'Slider para la página de actividades', '/actividades', true),
  ('Slider Explorar', 'explorar', 'Slider para explorar perfiles', '/explorar-perfiles', true)
ON CONFLICT (slug) DO NOTHING;

-- Done! 
SELECT 'Migration completed successfully' as status;

