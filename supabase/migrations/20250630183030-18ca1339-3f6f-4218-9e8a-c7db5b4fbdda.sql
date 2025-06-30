
-- Add quantity column to incoming_vehicles table
ALTER TABLE public.incoming_vehicles 
ADD COLUMN quantity INTEGER DEFAULT 1;

-- Add index for better performance on quantity queries
CREATE INDEX idx_incoming_vehicles_quantity ON incoming_vehicles(quantity);
