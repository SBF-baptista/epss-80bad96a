
CREATE TABLE public.frota_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  data_atendimento timestamptz NOT NULL,
  tempo_primeiro_atendimento timestamptz,
  descricao_problema text NOT NULL,
  classificacao text NOT NULL,
  atendente_suporte text NOT NULL,
  canal_entrada text NOT NULL,
  descricao_solucao text,
  status text NOT NULL DEFAULT 'Em Atendimento',
  data_encerramento timestamptz,
  responsavel_escalonado text,
  data_escalonamento timestamptz,
  produto text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.frota_ticket_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_tickets TO authenticated;
GRANT ALL ON public.frota_tickets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.frota_ticket_companies TO authenticated;
GRANT ALL ON public.frota_ticket_companies TO service_role;

ALTER TABLE public.frota_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frota_ticket_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage frota tickets" ON public.frota_tickets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Chamados users can view tickets" ON public.frota_tickets
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'chamados'::app_module, 'view'::permission_level));

CREATE POLICY "Chamados users can insert tickets" ON public.frota_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'chamados'::app_module, 'edit'::permission_level));

CREATE POLICY "Chamados users can update tickets" ON public.frota_tickets
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'chamados'::app_module, 'edit'::permission_level))
  WITH CHECK (public.has_module_access(auth.uid(), 'chamados'::app_module, 'edit'::permission_level));

CREATE POLICY "Admins can manage ticket companies" ON public.frota_ticket_companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Chamados users can view ticket companies" ON public.frota_ticket_companies
  FOR SELECT TO authenticated
  USING (public.has_module_access(auth.uid(), 'chamados'::app_module, 'view'::permission_level));

CREATE POLICY "Chamados users can insert ticket companies" ON public.frota_ticket_companies
  FOR INSERT TO authenticated
  WITH CHECK (public.has_module_access(auth.uid(), 'chamados'::app_module, 'edit'::permission_level));

CREATE POLICY "Chamados users can update ticket companies" ON public.frota_ticket_companies
  FOR UPDATE TO authenticated
  USING (public.has_module_access(auth.uid(), 'chamados'::app_module, 'edit'::permission_level))
  WITH CHECK (public.has_module_access(auth.uid(), 'chamados'::app_module, 'edit'::permission_level));

CREATE INDEX idx_frota_tickets_data_atendimento ON public.frota_tickets(data_atendimento DESC);
CREATE INDEX idx_frota_tickets_cnpj ON public.frota_tickets(cnpj);
