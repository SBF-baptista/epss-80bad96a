-- 1. Create table for custom scheduling services (opções personalizadas de serviço)
CREATE TABLE IF NOT EXISTS public.scheduling_service_options (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.scheduling_service_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduling_service_options
CREATE POLICY "Authenticated users can view service options"
ON public.scheduling_service_options FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create service options"
ON public.scheduling_service_options FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Insert default service options
INSERT INTO public.scheduling_service_options (service_name) VALUES 
    ('Instalação'),
    ('Manutenção'),
    ('Retirada')
ON CONFLICT (service_name) DO NOTHING;

-- 2. Add camera_extra_details to incoming_vehicles for storing camera extra info
ALTER TABLE public.incoming_vehicles 
ADD COLUMN IF NOT EXISTS camera_extra_quantity INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS camera_extra_locations TEXT DEFAULT NULL;

-- 3. Add new photo types for test execution (rastreador, positivo, negativo, pós-chave, bloqueio)
-- The homologation_photos table already exists, we just need to document the new photo_type values:
-- 'rastreador', 'positivo', 'negativo', 'pos_chave', 'bloqueio'
-- No schema change needed, just using new photo_type values

COMMENT ON COLUMN public.incoming_vehicles.camera_extra_quantity IS 'Quantidade de câmeras extras para este veículo';
COMMENT ON COLUMN public.incoming_vehicles.camera_extra_locations IS 'Localização onde ficarão as câmeras extras';