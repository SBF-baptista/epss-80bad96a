
-- Tabela para receber dados de instalação via endpoint externo
CREATE TABLE public.instalacoes_recebidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Cliente
  company_name TEXT,
  cpf_cnpj TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,

  -- Endereço da instalação
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_district TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,

  -- Técnico
  technician_name TEXT,
  technician_phone TEXT,
  technician_document TEXT,

  -- Instalação
  installation_date TIMESTAMPTZ,
  installation_type TEXT,              -- ex: instalacao, manutencao, retirada
  service_order TEXT,                  -- OS externa
  external_reference TEXT,             -- id do sistema origem

  -- Veículo
  vehicle_plate TEXT,
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_color TEXT,
  vehicle_chassis TEXT,
  vehicle_renavam TEXT,

  -- Rastreador / equipamento
  tracker_model TEXT,
  tracker_imei TEXT,
  tracker_serial TEXT,
  sim_iccid TEXT,
  sim_operator TEXT,
  sim_phone TEXT,

  -- Extras estruturados
  accessories JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name, quantity, serial}]
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{url, type, description}]
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb,     -- respostas de checklist
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,      -- lat/lng, device, versao app

  observations TEXT,

  -- Controle
  status TEXT NOT NULL DEFAULT 'pending',           -- pending | processed | rejected
  raw_payload JSONB NOT NULL,
  source TEXT,                                       -- identificador da origem
  request_id TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grants (endpoint escreve via service_role; tela interna lê via authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instalacoes_recebidas TO authenticated;
GRANT ALL ON public.instalacoes_recebidas TO service_role;

ALTER TABLE public.instalacoes_recebidas ENABLE ROW LEVEL SECURITY;

-- Admin/gestor podem gerenciar; demais autenticados podem visualizar
CREATE POLICY "Autenticados podem visualizar instalacoes recebidas"
ON public.instalacoes_recebidas
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins podem gerenciar instalacoes recebidas"
ON public.instalacoes_recebidas
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Índices úteis para a tela futura
CREATE INDEX idx_instalacoes_recebidas_created_at ON public.instalacoes_recebidas (created_at DESC);
CREATE INDEX idx_instalacoes_recebidas_status ON public.instalacoes_recebidas (status);
CREATE INDEX idx_instalacoes_recebidas_plate ON public.instalacoes_recebidas (vehicle_plate);
CREATE INDEX idx_instalacoes_recebidas_company ON public.instalacoes_recebidas (company_name);

-- Trigger updated_at
CREATE TRIGGER trg_instalacoes_recebidas_updated_at
BEFORE UPDATE ON public.instalacoes_recebidas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
