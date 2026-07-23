
CREATE TABLE public.frota_unit_activation_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filial_contrato TEXT NOT NULL,
  tipo_contrato TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('activate','deactivate')),
  requested_by UUID REFERENCES auth.users(id),
  requested_by_email TEXT,
  api_status INTEGER,
  api_ok BOOLEAN NOT NULL DEFAULT false,
  api_response JSONB,
  error_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.frota_unit_activation_audit TO authenticated;
GRANT ALL ON public.frota_unit_activation_audit TO service_role;

ALTER TABLE public.frota_unit_activation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activation audit"
  ON public.frota_unit_activation_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert activation audit"
  ON public.frota_unit_activation_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_frota_activation_audit_created_at ON public.frota_unit_activation_audit(created_at DESC);
CREATE INDEX idx_frota_activation_audit_filial ON public.frota_unit_activation_audit(filial_contrato);
