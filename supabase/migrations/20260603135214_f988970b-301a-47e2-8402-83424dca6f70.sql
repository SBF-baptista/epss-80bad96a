CREATE POLICY "Authenticated upload homologation-photos bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'homologation-photos');