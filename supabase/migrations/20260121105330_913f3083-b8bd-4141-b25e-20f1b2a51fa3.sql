-- Add Segsale mirror columns to homologation_kits table
ALTER TABLE public.homologation_kits
ADD COLUMN segsale_product TEXT,
ADD COLUMN segsale_module TEXT,
ADD COLUMN segsale_accessory TEXT;