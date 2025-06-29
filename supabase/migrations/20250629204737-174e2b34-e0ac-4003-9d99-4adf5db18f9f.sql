
-- Create enum for homologation status
CREATE TYPE homologation_status AS ENUM ('homologar', 'em_homologacao', 'em_testes_finais', 'homologado');

-- Create table for homologation cards
CREATE TABLE public.homologation_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  status homologation_status NOT NULL DEFAULT 'homologar',
  requested_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  UNIQUE(brand, model) -- Prevent duplicate cards for same brand/model combination
);

-- Add Row Level Security
ALTER TABLE public.homologation_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for homologation cards
CREATE POLICY "Users can view all homologation cards" 
  ON public.homologation_cards 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create homologation cards" 
  ON public.homologation_cards 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update homologation cards" 
  ON public.homologation_cards 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_homologation_cards_updated_at 
  BEFORE UPDATE ON public.homologation_cards 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
