-- Add photo_type field to homologation_photos table
ALTER TABLE public.homologation_photos 
ADD COLUMN photo_type TEXT;

-- Add some useful constraints and default values
ALTER TABLE public.homologation_photos 
ADD CONSTRAINT check_photo_type_valid 
CHECK (photo_type IN ('veiculo', 'chassi', 'can_location', 'can_wires', 'instalacao', 'homologacao', 'outros') OR photo_type IS NULL);

-- Add comment for documentation
COMMENT ON COLUMN public.homologation_photos.photo_type IS 'Type/category of the photo: veiculo, chassi, can_location, can_wires, instalacao, homologacao, outros';

-- Update existing photos to have appropriate photo_type based on filename
UPDATE public.homologation_photos 
SET photo_type = CASE 
  WHEN LOWER(file_name) LIKE '%veiculo_%' OR LOWER(file_name) LIKE '%vehicle_%' THEN 'veiculo'
  WHEN LOWER(file_name) LIKE '%chassi_%' OR LOWER(file_name) LIKE '%chassis_%' THEN 'chassi'
  WHEN LOWER(file_name) LIKE '%can_location_%' THEN 'can_location'
  WHEN LOWER(file_name) LIKE '%can_wires_%' THEN 'can_wires'
  WHEN LOWER(file_name) LIKE '%foto_homologacao_%' THEN 'homologacao'
  WHEN LOWER(file_name) LIKE '%whatsapp%' OR LOWER(file_name) LIKE '%img_%' OR LOWER(file_name) LIKE '%image%' THEN 'homologacao'
  ELSE 'outros'
END
WHERE photo_type IS NULL;