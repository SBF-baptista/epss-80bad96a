-- Make homologation_card_id optional in homologation_kits table
ALTER TABLE homologation_kits 
ALTER COLUMN homologation_card_id DROP NOT NULL;

-- Add comment to clarify the optional relationship
COMMENT ON COLUMN homologation_kits.homologation_card_id IS 'Optional reference to homologation card. Kits can be created independently.';