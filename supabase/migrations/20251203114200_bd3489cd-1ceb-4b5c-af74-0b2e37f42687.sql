-- Create table for installation schedules
CREATE TABLE public.installation_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  technician_name TEXT NOT NULL,
  technician_whatsapp TEXT NOT NULL,
  customer TEXT NOT NULL,
  address TEXT NOT NULL,
  plate TEXT NOT NULL,
  service TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  tracker_model TEXT NOT NULL,
  scheduled_by TEXT NOT NULL,
  reference_point TEXT,
  phone TEXT,
  local_contact TEXT,
  observation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.installation_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view installation schedules"
ON public.installation_schedules
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create installation schedules"
ON public.installation_schedules
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update installation schedules"
ON public.installation_schedules
FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete installation schedules"
ON public.installation_schedules
FOR DELETE
USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_installation_schedules_updated_at
BEFORE UPDATE ON public.installation_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();