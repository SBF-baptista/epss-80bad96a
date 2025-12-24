-- Add kit_schedule_id column to production_items to allow linking items directly to schedules
ALTER TABLE public.production_items 
  ALTER COLUMN pedido_id DROP NOT NULL,
  ADD COLUMN kit_schedule_id uuid REFERENCES public.kit_schedules(id);

-- Create index for better performance
CREATE INDEX idx_production_items_kit_schedule_id ON public.production_items(kit_schedule_id);

-- Add check constraint to ensure at least one reference exists
ALTER TABLE public.production_items 
  ADD CONSTRAINT chk_production_items_reference 
  CHECK (pedido_id IS NOT NULL OR kit_schedule_id IS NOT NULL);