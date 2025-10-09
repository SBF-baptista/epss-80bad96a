-- Add plate column to incoming_vehicles table
ALTER TABLE incoming_vehicles 
ADD COLUMN IF NOT EXISTS plate text;