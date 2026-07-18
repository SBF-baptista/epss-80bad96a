
CREATE TABLE public.kickoff_bypass_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incoming_vehicle_id uuid REFERENCES public.incoming_vehicles(id) ON DELETE SET NULL,
  plate text,
  brand text,
  model text,
  company_name text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_email text,
  justification text NOT NULL,
  resulting_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  resulting_kit_schedule_id uuid REFERENCES public.kit_schedules(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT kickoff_bypass_log_justification_min_length CHECK (char_length(btrim(justification)) >= 10)
);

CREATE INDEX idx_kickoff_bypass_log_created_at ON public.kickoff_bypass_log (created_at DESC);
CREATE INDEX idx_kickoff_bypass_log_performed_by ON public.kickoff_bypass_log (performed_by);
CREATE INDEX idx_kickoff_bypass_log_incoming_vehicle ON public.kickoff_bypass_log (incoming_vehicle_id);

GRANT SELECT, INSERT ON public.kickoff_bypass_log TO authenticated;
GRANT ALL ON public.kickoff_bypass_log TO service_role;

ALTER TABLE public.kickoff_bypass_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kickoff_bypass_log_select_with_view_access"
  ON public.kickoff_bypass_log
  FOR SELECT
  TO authenticated
  USING (
    public.has_module_access(auth.uid(), 'kickoff_bypass'::public.app_module, 'view'::public.permission_level)
  );

CREATE POLICY "kickoff_bypass_log_insert_self_with_edit_access"
  ON public.kickoff_bypass_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = auth.uid()
    AND public.has_module_access(auth.uid(), 'kickoff_bypass'::public.app_module, 'edit'::public.permission_level)
  );
