
-- Drop the existing automation rules table and recreate with the new structure
DROP TABLE IF EXISTS public.regras_automacao CASCADE;

-- Create the new automation_rules_extended table
CREATE TABLE public.automation_rules_extended (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  model_year TEXT,
  tracker_model TEXT NOT NULL,
  configuration TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX idx_automation_rules_extended_lookup ON public.automation_rules_extended(brand, model, model_year);

-- Enable Row Level Security
ALTER TABLE public.automation_rules_extended ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to perform all operations
CREATE POLICY "Allow authenticated users full access to automation rules extended" 
  ON public.automation_rules_extended 
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime for live updates
ALTER TABLE public.automation_rules_extended REPLICA IDENTITY FULL;

-- Insert the sample data
INSERT INTO public.automation_rules_extended (category, brand, model, model_year, tracker_model, configuration) VALUES
('PESADO', 'VOLKSWAGEN', '13190 WORKER 2P E5 (ESPAGIDOR)', '2013', 'SMART5', 'FMS250'),
('MÁQUINA', 'CATERPILLAR', '313D2 (ESCAVADEIRA) 13T', '2022', 'SMART5', 'Testar Truck14, Truck18 ou FMS250'),
('MÁQUINA', 'XCMG', 'ROLO 9 PNEUS', '2024', 'SMART5', 'J1939 + FMS250'),
('PESADO', 'VOLKSWAGEN', 'CAMINHAO 26.260 CRM 6X2 (BASCULANTE)', '2024', 'SMART5', 'HCV - Truck3 + FMS250'),
('PESADO', 'VOLKSWAGEN', '17.190 CRM 4X2', '2020', 'SMART5', 'HCV - Truck3 + FMS250'),
('PESADO', 'FORD', 'CARGO 1723B', '2017', 'SMART5', 'FMS250'),
('LEVE', 'BMW', 'X2 SDRIVE 20I X LINE', '2025', 'SMART5', 'OBD - BMW / LCV - BMW18'),
('LEVE', 'CITROEN', 'C3AIRCROSS FL 7', '2025', 'SMART5', 'LCV group - CITROEN13 / OBD - CITROEN'),
('MÁQUINA', 'HYUNDAI', 'R220LC ESCAVADEIRA', '2018', 'SMART5', 'J1939');
