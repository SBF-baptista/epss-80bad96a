-- Adicionar coluna de categoria aos kits de homologação
-- FMC150 = Telemetria, FMC130 = Rastreamento (inclui Copiloto)
ALTER TABLE public.homologation_kits
ADD COLUMN category text;

-- Criar índice para busca por categoria
CREATE INDEX idx_homologation_kits_category ON public.homologation_kits(category);