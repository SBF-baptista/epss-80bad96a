-- Create accessories table to store accessory data from incoming requests
CREATE TABLE public.accessories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incoming_vehicle_group_id UUID NOT NULL,
  company_name TEXT NOT NULL,
  usage_type TEXT NOT NULL,
  accessory_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.accessories ENABLE ROW LEVEL SECURITY;

-- Create policies for accessories
CREATE POLICY "System can create accessories" 
ON public.accessories 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update accessories" 
ON public.accessories 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can view accessories" 
ON public.accessories 
FOR SELECT 
USING (true);

-- Create index for better performance
CREATE INDEX idx_accessories_company_usage ON public.accessories(company_name, usage_type);
CREATE INDEX idx_accessories_received_at ON public.accessories(received_at DESC);