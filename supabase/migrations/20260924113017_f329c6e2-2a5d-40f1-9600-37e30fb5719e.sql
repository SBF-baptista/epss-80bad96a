ALTER TABLE public.homologation_kits
  ADD COLUMN IF NOT EXISTS configuration_count integer,
  ADD COLUMN IF NOT EXISTS configurations text[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.kit_configuration_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.kit_configuration_options TO authenticated;
GRANT ALL ON public.kit_configuration_options TO service_role;
ALTER TABLE public.kit_configuration_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view configuration options" ON public.kit_configuration_options
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create configuration options" ON public.kit_configuration_options
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

INSERT INTO public.kit_configuration_options (name)
SELECT DISTINCT trim(configuration) FROM public.automation_rules_extended
WHERE configuration IS NOT NULL AND trim(configuration) <> ''
ON CONFLICT (name) DO NOTHING;