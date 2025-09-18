-- Update homologation_kit_accessories table to support different item types
ALTER TABLE homologation_kit_accessories 
ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'accessory' CHECK (item_type IN ('equipment', 'accessory', 'supply'));

-- Add description column for better item management
ALTER TABLE homologation_kit_accessories 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update the existing accessory_name column to be more generic
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'homologation_kit_accessories' AND column_name = 'accessory_name') THEN
        ALTER TABLE homologation_kit_accessories RENAME COLUMN accessory_name TO item_name;
    END IF;
END $$;

-- Create an index for better performance on item_type queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_kit_accessories_item_type ON homologation_kit_accessories(item_type);