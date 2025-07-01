
-- Add configuration column to homologation_cards table
ALTER TABLE public.homologation_cards 
ADD COLUMN configuration TEXT;

-- Create an index for better performance on configuration lookups
CREATE INDEX idx_homologation_cards_configuration ON homologation_cards(configuration);
