-- Estender tabela de clientes com campos para dados de vendas
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_name text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS package_name text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_value numeric;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS contract_number text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sales_representative text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS vehicles jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS accessories text[];
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS modules text[];