-- Create storage bucket for homologation photos (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('homologation_photos', 'homologation_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist to recreate them
DROP POLICY IF EXISTS "Public can view homologation photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload homologation photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own homologation photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete homologation photos" ON storage.objects;

-- Create RLS policies for homologation_photos bucket
CREATE POLICY "Public can view homologation photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'homologation_photos');

CREATE POLICY "Authenticated users can upload homologation photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'homologation_photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own homologation photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'homologation_photos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete homologation photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'homologation_photos'
  AND auth.role() = 'authenticated'
);