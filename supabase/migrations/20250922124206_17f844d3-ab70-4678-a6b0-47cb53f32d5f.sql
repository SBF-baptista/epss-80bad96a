-- Create table for managing kit item options (equipment, accessories, supplies)
CREATE TABLE public.kit_item_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('equipment', 'accessory', 'supply')),
  description text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(item_name, item_type)
);

-- Enable RLS
ALTER TABLE public.kit_item_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all kit item options"
ON public.kit_item_options
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create kit item options"
ON public.kit_item_options
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own kit item options"
ON public.kit_item_options
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Only admins can delete kit item options"
ON public.kit_item_options
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_kit_item_options_updated_at
  BEFORE UPDATE ON public.kit_item_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some initial equipment data based on the existing tracker models
INSERT INTO public.kit_item_options (item_name, item_type, description, created_by) VALUES
  ('Positron PX300', 'equipment', 'Rastreador Positron modelo PX300', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Queclink GV75', 'equipment', 'Rastreador Queclink modelo GV75', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Ruptella ECO4', 'equipment', 'Rastreador Ruptella modelo ECO4', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Ruptella Smart5', 'equipment', 'Rastreador Ruptella modelo Smart5', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Teltonika FMB920', 'equipment', 'Rastreador Teltonika modelo FMB920', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf');

-- Insert some common accessories
INSERT INTO public.kit_item_options (item_name, item_type, description, created_by) VALUES
  ('Antena GPS Externa', 'accessory', 'Antena GPS para instalação externa', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Cabo de Alimentação', 'accessory', 'Cabo de alimentação padrão 12V/24V', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Suporte de Fixação', 'accessory', 'Suporte para fixação do equipamento', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Conector OBD', 'accessory', 'Conector para porta OBD do veículo', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf');

-- Insert some common supplies
INSERT INTO public.kit_item_options (item_name, item_type, description, created_by) VALUES
  ('Fita Isolante', 'supply', 'Fita isolante para instalação', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Abraçadeira Plástica', 'supply', 'Abraçadeira para fixação de cabos', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Espuma Dupla Face', 'supply', 'Espuma adesiva dupla face', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf'),
  ('Parafuso Auto Atarraxante', 'supply', 'Parafuso para fixação', 'de67e1c5-8fb0-4169-8153-bc5e0a1ecdcf');