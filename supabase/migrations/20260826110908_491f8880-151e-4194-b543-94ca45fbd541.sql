CREATE TABLE public.equipment_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.equipment_models TO authenticated;
GRANT UPDATE, DELETE ON public.equipment_models TO authenticated;
GRANT ALL ON public.equipment_models TO service_role;

ALTER TABLE public.equipment_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view equipment models"
ON public.equipment_models FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can create equipment models"
ON public.equipment_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and gestores can update equipment models"
ON public.equipment_models FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE POLICY "Admins and gestores can delete equipment models"
ON public.equipment_models FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestor'));

CREATE TRIGGER update_equipment_models_updated_at
BEFORE UPDATE ON public.equipment_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.homologation_cards ADD COLUMN IF NOT EXISTS equipment_model text;
ALTER TABLE public.installation_schedules ADD COLUMN IF NOT EXISTS equipment_model text;
ALTER TABLE public.kit_schedules ADD COLUMN IF NOT EXISTS equipment_model text;