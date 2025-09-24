-- Create kit schedules table for managing technician assignments and installation dates
CREATE TABLE IF NOT EXISTS public.kit_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kit_id UUID NOT NULL REFERENCES public.homologation_kits(id) ON DELETE CASCADE,
  technician_id UUID NOT NULL REFERENCES public.technicians(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  installation_time TIME DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(technician_id, scheduled_date, installation_time)
);

-- Enable RLS
ALTER TABLE public.kit_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for kit_schedules
CREATE POLICY "Authenticated users can view kit schedules" 
ON public.kit_schedules 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create kit schedules" 
ON public.kit_schedules 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update kit schedules" 
ON public.kit_schedules 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete kit schedules" 
ON public.kit_schedules 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_kit_schedules_updated_at
BEFORE UPDATE ON public.kit_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();