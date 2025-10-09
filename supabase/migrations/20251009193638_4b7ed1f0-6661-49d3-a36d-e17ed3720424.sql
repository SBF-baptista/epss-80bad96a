-- Rename id_resumo_venda to sale_summary_id in customers table
ALTER TABLE customers 
RENAME COLUMN id_resumo_venda TO sale_summary_id;

-- Update any indexes that reference the old column name
-- (No specific index found, but this is a safety measure)

-- Add comment to document the change
COMMENT ON COLUMN customers.sale_summary_id IS 'Segsale sale summary ID (formerly id_resumo_venda)';