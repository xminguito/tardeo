-- Add multilingual fields to activities table
ALTER TABLE public.activities 
  ADD COLUMN title_es TEXT,
  ADD COLUMN title_en TEXT,
  ADD COLUMN title_ca TEXT,
  ADD COLUMN title_fr TEXT,
  ADD COLUMN title_it TEXT,
  ADD COLUMN title_de TEXT,
  ADD COLUMN description_es TEXT,
  ADD COLUMN description_en TEXT,
  ADD COLUMN description_ca TEXT,
  ADD COLUMN description_fr TEXT,
  ADD COLUMN description_it TEXT,
  ADD COLUMN description_de TEXT;

-- Migrate existing data: copy title and description to title_es and description_es
UPDATE public.activities 
SET 
  title_es = title,
  description_es = description
WHERE title_es IS NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN public.activities.title_es IS 'Spanish title';
COMMENT ON COLUMN public.activities.title_en IS 'English title';
COMMENT ON COLUMN public.activities.title_ca IS 'Catalan title';
COMMENT ON COLUMN public.activities.title_fr IS 'French title';
COMMENT ON COLUMN public.activities.title_it IS 'Italian title';
COMMENT ON COLUMN public.activities.title_de IS 'German title';
COMMENT ON COLUMN public.activities.description_es IS 'Spanish description';
COMMENT ON COLUMN public.activities.description_en IS 'English description';
COMMENT ON COLUMN public.activities.description_ca IS 'Catalan description';
COMMENT ON COLUMN public.activities.description_fr IS 'French description';
COMMENT ON COLUMN public.activities.description_it IS 'Italian description';
COMMENT ON COLUMN public.activities.description_de IS 'German description';