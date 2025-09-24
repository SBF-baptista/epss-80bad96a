-- Create technicians table
CREATE TABLE public.technicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address_street TEXT,
  address_number TEXT,
  postal_code TEXT NOT NULL,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- Create policies for technicians access
CREATE POLICY "Authenticated users can view technicians" 
ON public.technicians 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can create technicians" 
ON public.technicians 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update technicians" 
ON public.technicians 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Admins can delete technicians" 
ON public.technicians 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_technicians_updated_at
BEFORE UPDATE ON public.technicians
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();