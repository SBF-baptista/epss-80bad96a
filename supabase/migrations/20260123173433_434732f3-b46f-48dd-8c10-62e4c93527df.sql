-- Remove old constraint
ALTER TABLE public.homologation_kit_accessories 
  DROP CONSTRAINT IF EXISTS homologation_kit_accessories_item_type_check;

-- Add new constraint with 'module' type included
ALTER TABLE public.homologation_kit_accessories 
  ADD CONSTRAINT homologation_kit_accessories_item_type_check 
  CHECK (item_type = ANY (ARRAY['equipment'::text, 'accessory'::text, 'supply'::text, 'module'::text]));