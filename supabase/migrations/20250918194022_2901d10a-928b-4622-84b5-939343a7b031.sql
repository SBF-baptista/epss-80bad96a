-- Update homologation_kit_accessories table to support different item types
ALTER TABLE homologation_kit_accessories 
ADD COLUMN item_type TEXT NOT NULL DEFAULT 'accessory' CHECK (item_type IN ('equipment', 'accessory', 'supply'));

-- Add description column for better item management
ALTER TABLE homologation_kit_accessories 
ADD COLUMN description TEXT;

-- Update the existing accessory_name column to be more generic
ALTER TABLE homologation_kit_accessories 
RENAME COLUMN accessory_name TO item_name;

-- Create an index for better performance on item_type queries
CREATE INDEX idx_kit_accessories_item_type ON homologation_kit_accessories(item_type);

-- Create an index for kit_id queries
CREATE INDEX idx_kit_accessories_kit_id ON homologation_kit_accessories(kit_id);

-- Add updated_at trigger for the accessories table
CREATE TRIGGER update_kit_accessories_updated_at
    BEFORE UPDATE ON homologation_kit_accessories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();