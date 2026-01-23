-- Alterar colunas segsale_module e segsale_accessory para arrays (TEXT[])
-- Primeiro, converter os dados existentes para array

ALTER TABLE public.homologation_kits
ALTER COLUMN segsale_module TYPE TEXT[] 
USING CASE 
  WHEN segsale_module IS NULL THEN NULL
  WHEN segsale_module = '' THEN NULL
  ELSE ARRAY[segsale_module]
END;

ALTER TABLE public.homologation_kits
ALTER COLUMN segsale_accessory TYPE TEXT[] 
USING CASE 
  WHEN segsale_accessory IS NULL THEN NULL
  WHEN segsale_accessory = '' THEN NULL
  ELSE ARRAY[segsale_accessory]
END;