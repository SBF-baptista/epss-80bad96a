
CREATE TABLE public.frota_units_pending_imei (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incoming_vehicle_id UUID REFERENCES public.incoming_vehicles(id) ON DELETE SET NULL,
  plate TEXT,
  brand TEXT,
  model TEXT,
  company_name TEXT,
  frota_response JSONB,
  status TEXT NOT NULL DEFAULT 'aguardando_imei' CHECK (status IN ('aguardando_imei','concluido','erro_criacao')),
  imei TEXT,
  linked_by UUID REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_frota_units_pending_imei_status ON public.frota_units_pending_imei(status);
CREATE INDEX idx_frota_units_pending_imei_created_at ON public.frota_units_pending_imei(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_units_pending_imei TO authenticated;
GRANT ALL ON public.frota_units_pending_imei TO service_role;

ALTER TABLE public.frota_units_pending_imei ENABLE ROW LEVEL SECURITY;

CREATE POLICY frota_units_pending_imei_select_admin_or_allowed
  ON public.frota_units_pending_imei FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.kickoff_bypass_allowed_users a
      WHERE lower(a.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE POLICY frota_units_pending_imei_update_admin_or_allowed
  ON public.frota_units_pending_imei FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.kickoff_bypass_allowed_users a
      WHERE lower(a.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.kickoff_bypass_allowed_users a
      WHERE lower(a.email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    )
  );

CREATE TRIGGER trg_frota_units_pending_imei_updated_at
  BEFORE UPDATE ON public.frota_units_pending_imei
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
