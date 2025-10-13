-- Add kickoff-related fields to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS needs_blocking boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS decision_maker_name text,
ADD COLUMN IF NOT EXISTS decision_maker_role text,
ADD COLUMN IF NOT EXISTS decision_maker_email text,
ADD COLUMN IF NOT EXISTS decision_maker_phone text,
ADD COLUMN IF NOT EXISTS influencer_name text,
ADD COLUMN IF NOT EXISTS influencer_role text,
ADD COLUMN IF NOT EXISTS influencer_email text,
ADD COLUMN IF NOT EXISTS influencer_phone text,
ADD COLUMN IF NOT EXISTS operations_contact_name text,
ADD COLUMN IF NOT EXISTS operations_contact_role text,
ADD COLUMN IF NOT EXISTS operations_contact_email text,
ADD COLUMN IF NOT EXISTS operations_contact_phone text,
ADD COLUMN IF NOT EXISTS installation_locations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS has_installation_particularity boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS installation_particularity_details text,
ADD COLUMN IF NOT EXISTS kickoff_notes text;

COMMENT ON COLUMN customers.needs_blocking IS 'Indica se o cliente necessita de bloqueio';
COMMENT ON COLUMN customers.decision_maker_name IS 'Nome do decisor';
COMMENT ON COLUMN customers.installation_locations IS 'Array de locais de instalação do cliente';
COMMENT ON COLUMN customers.has_installation_particularity IS 'Indica se há particularidades de instalação';
COMMENT ON COLUMN customers.installation_particularity_details IS 'Detalhes das particularidades de instalação (disponibilidade)';
COMMENT ON COLUMN customers.kickoff_notes IS 'Observações do kickoff';