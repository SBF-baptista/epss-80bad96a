CREATE TABLE public.production_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_schedule_id uuid NOT NULL REFERENCES public.kit_schedules(id) ON DELETE CASCADE,
  stage text NOT NULL,
  item_key text NOT NULL,
  item_category text NOT NULL,
  item_name text NOT NULL,
  expected_quantity integer NOT NULL DEFAULT 0,
  counted_quantity integer NOT NULL DEFAULT 0,
  is_checked boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  checked_by uuid,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT production_check_items_stage_valid CHECK (stage IN ('counting', 'verification')),
  CONSTRAINT production_check_items_quantities_valid CHECK (expected_quantity >= 0 AND counted_quantity >= 0),
  CONSTRAINT production_check_items_schedule_stage_item_unique UNIQUE (kit_schedule_id, stage, item_key)
);

GRANT SELECT, INSERT, UPDATE ON public.production_check_items TO authenticated;
GRANT ALL ON public.production_check_items TO service_role;

ALTER TABLE public.production_check_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kanban viewers can view production checks"
ON public.production_check_items
FOR SELECT
TO authenticated
USING (public.has_module_access(auth.uid(), 'kanban', 'view'));

CREATE POLICY "Kanban editors can create production checks"
ON public.production_check_items
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.has_module_access(auth.uid(), 'kanban', 'edit')
);

CREATE POLICY "Kanban editors can update production checks"
ON public.production_check_items
FOR UPDATE
TO authenticated
USING (public.has_module_access(auth.uid(), 'kanban', 'edit'))
WITH CHECK (public.has_module_access(auth.uid(), 'kanban', 'edit'));

CREATE POLICY "Kanban admins can delete production checks"
ON public.production_check_items
FOR DELETE
TO authenticated
USING (public.has_module_access(auth.uid(), 'kanban', 'admin'));

CREATE INDEX production_check_items_schedule_stage_idx
ON public.production_check_items (kit_schedule_id, stage);

CREATE TRIGGER update_production_check_items_updated_at
BEFORE UPDATE ON public.production_check_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();