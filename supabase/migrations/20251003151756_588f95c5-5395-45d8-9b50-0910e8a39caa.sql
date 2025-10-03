-- Create table to store Segsale sales data
CREATE TABLE IF NOT EXISTS public.segsale_sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  id_resumo_venda integer NOT NULL,
  company_name text NOT NULL,
  usage_type text NOT NULL,
  vehicles jsonb NOT NULL,
  fetched_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.segsale_sales ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all sales data
CREATE POLICY "Authenticated users can view sales data"
ON public.segsale_sales
FOR SELECT
TO authenticated
USING (true);

-- Allow system to insert sales data
CREATE POLICY "System can insert sales data"
ON public.segsale_sales
FOR INSERT
TO service_role
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_segsale_sales_id_resumo_venda ON public.segsale_sales(id_resumo_venda);
CREATE INDEX idx_segsale_sales_company_name ON public.segsale_sales(company_name);
CREATE INDEX idx_segsale_sales_fetched_at ON public.segsale_sales(fetched_at DESC);