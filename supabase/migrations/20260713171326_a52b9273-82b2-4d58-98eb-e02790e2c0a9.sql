CREATE TABLE public.retiradas_recebidas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato TEXT,
  filial TEXT,
  placa TEXT,
  imei TEXT,
  tecnico_retirada TEXT,
  motivo TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_payload JSONB,
  source TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retiradas_recebidas TO authenticated;
GRANT ALL ON public.retiradas_recebidas TO service_role;

ALTER TABLE public.retiradas_recebidas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read retiradas"
  ON public.retiradas_recebidas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Service role manages retiradas"
  ON public.retiradas_recebidas FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_retiradas_created_at ON public.retiradas_recebidas(created_at DESC);
CREATE INDEX idx_retiradas_status ON public.retiradas_recebidas(status);
CREATE INDEX idx_retiradas_placa ON public.retiradas_recebidas(placa);
CREATE INDEX idx_retiradas_contrato ON public.retiradas_recebidas(contrato);
CREATE INDEX idx_retiradas_imei ON public.retiradas_recebidas(imei);

CREATE TRIGGER update_retiradas_recebidas_updated_at
  BEFORE UPDATE ON public.retiradas_recebidas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();