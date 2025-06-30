
-- Create enum for usage types
CREATE TYPE vehicle_usage_type AS ENUM ('particular', 'comercial', 'frota');

-- Create table for incoming vehicles
CREATE TABLE public.incoming_vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER,
  usage_type vehicle_usage_type NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false,
  created_order_id UUID,
  created_homologation_id UUID,
  processing_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.incoming_vehicles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to view incoming vehicles
CREATE POLICY "Users can view incoming vehicles" 
  ON public.incoming_vehicles 
  FOR SELECT 
  USING (true);

-- Create policy to allow system to insert incoming vehicles
CREATE POLICY "System can create incoming vehicles" 
  ON public.incoming_vehicles 
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow system to update incoming vehicles
CREATE POLICY "System can update incoming vehicles" 
  ON public.incoming_vehicles 
  FOR UPDATE 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_incoming_vehicles_brand_vehicle ON incoming_vehicles(brand, vehicle);
CREATE INDEX idx_incoming_vehicles_processed ON incoming_vehicles(processed);
CREATE INDEX idx_incoming_vehicles_received_at ON incoming_vehicles(received_at);
