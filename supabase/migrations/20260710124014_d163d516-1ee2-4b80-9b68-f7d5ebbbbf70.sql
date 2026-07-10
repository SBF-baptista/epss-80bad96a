
ALTER TABLE public.installation_schedules
  ADD COLUMN IF NOT EXISTS deletion_request_status text;

CREATE TABLE IF NOT EXISTS public.solicitacoes_exclusao_agendamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid REFERENCES public.installation_schedules(id) ON DELETE SET NULL,
  veiculo text,
  filial_contrato text,
  tipo_contrato text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  solicitado_por uuid NOT NULL,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  decidido_por uuid,
  decidido_em timestamptz,
  motivo text,
  resultado_api jsonb,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.solicitacoes_exclusao_agendamento TO authenticated;
GRANT ALL ON public.solicitacoes_exclusao_agendamento TO service_role;

ALTER TABLE public.solicitacoes_exclusao_agendamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own deletion requests"
  ON public.solicitacoes_exclusao_agendamento
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = solicitado_por);

CREATE POLICY "Approvers and requesters can view deletion requests"
  ON public.solicitacoes_exclusao_agendamento
  FOR SELECT TO authenticated
  USING (
    auth.uid() = solicitado_por
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.can_view_module(auth.uid(), 'schedule_deletion_approval'::app_module)
  );

CREATE POLICY "Approvers can update deletion requests"
  ON public.solicitacoes_exclusao_agendamento
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.can_approve_module(auth.uid(), 'schedule_deletion_approval'::app_module)
  );

CREATE TRIGGER update_solicitacoes_exclusao_agendamento_updated_at
  BEFORE UPDATE ON public.solicitacoes_exclusao_agendamento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_solicitacoes_exclusao_status
  ON public.solicitacoes_exclusao_agendamento(status, solicitado_em DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_exclusao_agendamento
  ON public.solicitacoes_exclusao_agendamento(agendamento_id);
