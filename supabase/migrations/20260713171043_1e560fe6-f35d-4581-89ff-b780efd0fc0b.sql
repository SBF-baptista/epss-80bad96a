ALTER TABLE public.instalacoes_recebidas
  ADD COLUMN IF NOT EXISTS contrato TEXT,
  ADD COLUMN IF NOT EXISTS filial TEXT,
  ADD COLUMN IF NOT EXISTS placa TEXT,
  ADD COLUMN IF NOT EXISTS imei TEXT,
  ADD COLUMN IF NOT EXISTS tecnico_instalador TEXT;

CREATE INDEX IF NOT EXISTS idx_instalacoes_contrato ON public.instalacoes_recebidas(contrato);
CREATE INDEX IF NOT EXISTS idx_instalacoes_imei ON public.instalacoes_recebidas(imei);