-- Create shipment recipients table
CREATE TABLE public.shipment_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  complement TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shipment_recipients ENABLE ROW LEVEL SECURITY;

-- Create policies for shipment recipients
CREATE POLICY "Users can view all shipment recipients" 
ON public.shipment_recipients 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create shipment recipients" 
ON public.shipment_recipients 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can update shipment recipients" 
ON public.shipment_recipients 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

-- Add shipment columns to pedidos table
ALTER TABLE public.pedidos 
ADD COLUMN shipment_recipient_id UUID REFERENCES public.shipment_recipients(id),
ADD COLUMN shipment_address_street TEXT,
ADD COLUMN shipment_address_number TEXT,
ADD COLUMN shipment_address_neighborhood TEXT,
ADD COLUMN shipment_address_city TEXT,
ADD COLUMN shipment_address_state TEXT,
ADD COLUMN shipment_address_postal_code TEXT,
ADD COLUMN shipment_address_complement TEXT,
ADD COLUMN shipment_prepared_at TIMESTAMP WITH TIME ZONE;