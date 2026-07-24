-- 1. Novo módulo (para uso futuro em access_profiles; a rota em si já exige admin)
ALTER TYPE public.app_module ADD VALUE IF NOT EXISTS 'pending_sales_recovery';

-- 2. Tabela de auditoria da recuperação
CREATE TABLE public.pending_sales_recovery_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_summary_id integer NOT NULL,
  plate text NOT NULL,
  action text NOT NULL, -- 'sent_to_kickoff' | 'unit_created_now'
  system text,          -- 'frota' | 'auto' | null
  status text NOT NULL, -- 'success' | 'error' | 'blocked_already_exists'
  error_message text,
  justification text,
  performed_by uuid,
  performed_by_email text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_psrl_sale_summary ON public.pending_sales_recovery_log (sale_summary_id);
CREATE INDEX idx_psrl_plate ON public.pending_sales_recovery_log (plate);
CREATE INDEX idx_psrl_created_at ON public.pending_sales_recovery_log (created_at DESC);

-- 3. Grants
GRANT SELECT, INSERT ON public.pending_sales_recovery_log TO authenticated;
GRANT ALL ON public.pending_sales_recovery_log TO service_role;

-- 4. RLS: só admin
ALTER TABLE public.pending_sales_recovery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "psrl_admin_select"
  ON public.pending_sales_recovery_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "psrl_admin_insert"
  ON public.pending_sales_recovery_log
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));