-- Add homologation_status column to incoming_vehicles table
ALTER TABLE incoming_vehicles 
ADD COLUMN homologation_status homologation_status DEFAULT 'homologar';

-- Create index for better performance on status queries
CREATE INDEX idx_incoming_vehicles_homologation_status 
ON incoming_vehicles(homologation_status);

-- Add comment explaining the column
COMMENT ON COLUMN incoming_vehicles.homologation_status IS 
'Status de homologação do veículo. Quando "homologado", cria automaticamente agendamento no Planejamento.';