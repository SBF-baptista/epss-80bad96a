-- Add blocking type fields and contacts array to customers table
ALTER TABLE customers 
ADD COLUMN needs_engine_blocking boolean DEFAULT false,
ADD COLUMN needs_fuel_blocking boolean DEFAULT false,
ADD COLUMN needs_accelerator_blocking boolean DEFAULT false,
ADD COLUMN contacts jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN customers.contacts IS 'Array of contact objects with fields: type (decisor/influenciador/operacoes), name, role, email, phone';
COMMENT ON COLUMN customers.needs_engine_blocking IS 'Whether customer needs engine blocking';
COMMENT ON COLUMN customers.needs_fuel_blocking IS 'Whether customer needs fuel blocking';
COMMENT ON COLUMN customers.needs_accelerator_blocking IS 'Whether customer needs accelerator blocking';