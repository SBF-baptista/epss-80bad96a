-- Add English field names to incoming_vehicles table
ALTER TABLE incoming_vehicles 
ADD COLUMN IF NOT EXISTS sale_summary_id integer,
ADD COLUMN IF NOT EXISTS pending_contract_id integer;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_incoming_vehicles_sale_summary_id ON incoming_vehicles(sale_summary_id);
CREATE INDEX IF NOT EXISTS idx_incoming_vehicles_pending_contract_id ON incoming_vehicles(pending_contract_id);

-- Update existing records to copy id_resumo_venda to sale_summary_id
UPDATE incoming_vehicles 
SET sale_summary_id = id_resumo_venda,
    pending_contract_id = id_contrato_pendente
WHERE id_resumo_venda IS NOT NULL AND sale_summary_id IS NULL;