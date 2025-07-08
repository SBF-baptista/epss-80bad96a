-- Add company_name column to pedidos table
ALTER TABLE public.pedidos 
ADD COLUMN company_name TEXT;

-- Add company_name column to incoming_vehicles table  
ALTER TABLE public.incoming_vehicles
ADD COLUMN company_name TEXT;

-- Add index for better performance on company_name searches
CREATE INDEX idx_pedidos_company_name ON public.pedidos(company_name);
CREATE INDEX idx_incoming_vehicles_company_name ON public.incoming_vehicles(company_name);