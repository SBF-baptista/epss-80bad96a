-- Create customers table for storing client information
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  document_number TEXT NOT NULL, -- CPF or CNPJ
  document_type TEXT NOT NULL CHECK (document_type IN ('cpf', 'cnpj')),
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_neighborhood TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_postal_code TEXT NOT NULL,
  address_complement TEXT,
  UNIQUE(document_number)
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Create policies for customers
CREATE POLICY "Authenticated users can view customers" 
ON public.customers 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated users can create customers" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text AND auth.uid() = created_by);

CREATE POLICY "Authenticated users can update customers" 
ON public.customers 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add customer_id to kit_schedules table
ALTER TABLE public.kit_schedules 
ADD COLUMN customer_id UUID REFERENCES public.customers(id);

-- Add customer address fields to kit_schedules for historical data
ALTER TABLE public.kit_schedules 
ADD COLUMN customer_name TEXT,
ADD COLUMN customer_document_number TEXT,
ADD COLUMN customer_phone TEXT,
ADD COLUMN customer_email TEXT,
ADD COLUMN installation_address_street TEXT,
ADD COLUMN installation_address_number TEXT,
ADD COLUMN installation_address_neighborhood TEXT,
ADD COLUMN installation_address_city TEXT,
ADD COLUMN installation_address_state TEXT,
ADD COLUMN installation_address_postal_code TEXT,
ADD COLUMN installation_address_complement TEXT;