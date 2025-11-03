-- First, delete all objects from the duplicate bucket homologation_photos
DELETE FROM storage.objects WHERE bucket_id = 'homologation_photos';

-- Then delete the bucket itself
DELETE FROM storage.buckets WHERE id = 'homologation_photos';