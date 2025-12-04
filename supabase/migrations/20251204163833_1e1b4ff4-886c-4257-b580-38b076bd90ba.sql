-- Create table for custom vehicle models
CREATE TABLE public.custom_vehicle_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_code VARCHAR(10) NOT NULL,
  brand_name VARCHAR(100) NOT NULL,
  model_name VARCHAR(200) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(brand_code, model_name)
);

-- Enable RLS
ALTER TABLE public.custom_vehicle_models ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "Anyone can read custom models"
ON public.custom_vehicle_models
FOR SELECT
USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can create custom models"
ON public.custom_vehicle_models
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster searches
CREATE INDEX idx_custom_vehicle_models_brand ON public.custom_vehicle_models(brand_code);
CREATE INDEX idx_custom_vehicle_models_name ON public.custom_vehicle_models(model_name);