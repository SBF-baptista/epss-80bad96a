-- Create kits table for homologation cards
CREATE TABLE public.homologation_kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homologation_card_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create kit accessories table
CREATE TABLE public.homologation_kit_accessories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL,
  accessory_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.homologation_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homologation_kit_accessories ENABLE ROW LEVEL SECURITY;

-- Create policies for homologation_kits
CREATE POLICY "Authenticated users can view homologation kits" 
ON public.homologation_kits 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create homologation kits" 
ON public.homologation_kits 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update homologation kits" 
ON public.homologation_kits 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete homologation kits" 
ON public.homologation_kits 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create policies for homologation_kit_accessories
CREATE POLICY "Authenticated users can view kit accessories" 
ON public.homologation_kit_accessories 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create kit accessories" 
ON public.homologation_kit_accessories 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update kit accessories" 
ON public.homologation_kit_accessories 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete kit accessories" 
ON public.homologation_kit_accessories 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Add foreign key constraints
ALTER TABLE public.homologation_kits 
ADD CONSTRAINT fk_homologation_kits_card 
FOREIGN KEY (homologation_card_id) 
REFERENCES public.homologation_cards(id) 
ON DELETE CASCADE;

ALTER TABLE public.homologation_kit_accessories 
ADD CONSTRAINT fk_kit_accessories_kit 
FOREIGN KEY (kit_id) 
REFERENCES public.homologation_kits(id) 
ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_homologation_kits_updated_at
BEFORE UPDATE ON public.homologation_kits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_homologation_kits_card_id ON public.homologation_kits(homologation_card_id);
CREATE INDEX idx_kit_accessories_kit_id ON public.homologation_kit_accessories(kit_id);