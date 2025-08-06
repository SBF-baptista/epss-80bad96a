-- Remove the existing unique constraint that only considers brand and model
ALTER TABLE public.homologation_cards DROP CONSTRAINT homologation_cards_brand_model_key;

-- Add a new unique constraint that considers brand, model AND year
-- This allows the same brand+model combination with different years
ALTER TABLE public.homologation_cards 
ADD CONSTRAINT homologation_cards_brand_model_year_key 
UNIQUE (brand, model, year);