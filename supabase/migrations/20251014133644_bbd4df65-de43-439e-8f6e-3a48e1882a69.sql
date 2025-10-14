-- Add UNIQUE constraint to accessories table to support UPSERT operations
-- This allows the system to avoid duplicates and update existing records
ALTER TABLE accessories 
ADD CONSTRAINT accessories_unique_vehicle_name_categories 
UNIQUE (vehicle_id, name, categories);