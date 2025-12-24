-- Migration: Add translations column to communities table
-- Purpose: Store multilingual translations for community name and description
-- Languages supported: en, fr, de, it, ca (Spanish is the source language)

-- Add translations column (JSONB) with empty object as default
ALTER TABLE public.communities
ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.communities.translations IS 'Stores translations for name and description. Structure: { name_en, name_fr, name_de, name_it, name_ca, description_en, description_fr, description_de, description_it, description_ca }';

-- Create index for faster queries when filtering by translation availability
CREATE INDEX IF NOT EXISTS idx_communities_translations_not_empty 
ON public.communities ((translations <> '{}'::jsonb));

