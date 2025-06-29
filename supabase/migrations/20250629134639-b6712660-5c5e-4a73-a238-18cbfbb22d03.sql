
-- Add new fields to automation rules table and remove quantity_default
ALTER TABLE public.regras_automacao 
ADD COLUMN marca_veiculo TEXT NOT NULL DEFAULT '',
ADD COLUMN ano_veiculo INTEGER;

-- Remove the quantity_default column as it's no longer needed
ALTER TABLE public.regras_automacao 
DROP COLUMN quantidade_default;

-- Update the index to include the new fields for better query performance
DROP INDEX IF EXISTS idx_regras_automacao_modelo_veiculo;
CREATE INDEX idx_regras_automacao_lookup ON public.regras_automacao(marca_veiculo, modelo_veiculo, ano_veiculo);
