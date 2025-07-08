-- Add new homologation statuses for the enhanced workflow
ALTER TYPE homologation_status ADD VALUE 'agendamento_teste';
ALTER TYPE homologation_status ADD VALUE 'execucao_teste'; 
ALTER TYPE homologation_status ADD VALUE 'armazenamento_plataforma';

-- Add new fields to homologation_cards table for the enhanced workflow
ALTER TABLE public.homologation_cards 
ADD COLUMN test_scheduled_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN test_location TEXT,
ADD COLUMN test_technician TEXT,
ADD COLUMN installation_photos TEXT[], -- Array to store photo URLs
ADD COLUMN chassis_info TEXT,
ADD COLUMN manufacture_year INTEGER,
ADD COLUMN electrical_connection_type TEXT,
ADD COLUMN technical_observations TEXT,
ADD COLUMN test_checklist JSONB; -- Store checklist items and their completion status

-- Add comments for the new fields
COMMENT ON COLUMN public.homologation_cards.test_scheduled_date IS 'Date when the test is scheduled to be performed';
COMMENT ON COLUMN public.homologation_cards.test_location IS 'Location where the test will be performed';
COMMENT ON COLUMN public.homologation_cards.test_technician IS 'Technician responsible for the test';
COMMENT ON COLUMN public.homologation_cards.installation_photos IS 'Array of photo URLs from the installation process';
COMMENT ON COLUMN public.homologation_cards.chassis_info IS 'Chassis information collected during testing';
COMMENT ON COLUMN public.homologation_cards.manufacture_year IS 'Year of manufacture of the test vehicle';
COMMENT ON COLUMN public.homologation_cards.electrical_connection_type IS 'Type of electrical connection used';
COMMENT ON COLUMN public.homologation_cards.technical_observations IS 'Technical observations made during testing';
COMMENT ON COLUMN public.homologation_cards.test_checklist IS 'JSON object containing test checklist items and their completion status';