-- Create storage bucket for activity images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-images',
  'activity-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- Create RLS policies for activity images
CREATE POLICY "Imágenes de actividades son públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'activity-images');

CREATE POLICY "Usuarios autenticados pueden subir imágenes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'activity-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Usuarios pueden actualizar sus propias imágenes"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'activity-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Usuarios pueden eliminar sus propias imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'activity-images' 
  AND auth.uid() IS NOT NULL
);