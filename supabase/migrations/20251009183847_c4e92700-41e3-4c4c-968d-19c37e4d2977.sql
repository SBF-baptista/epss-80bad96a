-- Copy any remaining data from old columns to new columns
UPDATE incoming_vehicles 
SET sale_summary_id = COALESCE(sale_summary_id, id_resumo_venda),
    pending_contract_id = COALESCE(pending_contract_id, id_contrato_pendente)
WHERE sale_summary_id IS NULL OR pending_contract_id IS NULL;

-- Drop old columns
ALTER TABLE incoming_vehicles 
DROP COLUMN IF EXISTS id_resumo_venda,
DROP COLUMN IF EXISTS id_contrato_pendente;

-- Update unique constraint to use new column names
DROP INDEX IF EXISTS idx_incoming_vehicles_unique_segsale;
CREATE UNIQUE INDEX idx_incoming_vehicles_unique_segsale 
ON incoming_vehicles(brand, vehicle, COALESCE(year, 0), sale_summary_id) 
WHERE sale_summary_id IS NOT NULL;