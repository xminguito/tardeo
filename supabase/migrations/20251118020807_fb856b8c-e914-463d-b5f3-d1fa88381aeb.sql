-- Add secondary_images column to activities table
ALTER TABLE activities 
ADD COLUMN secondary_images text[] DEFAULT ARRAY[]::text[];