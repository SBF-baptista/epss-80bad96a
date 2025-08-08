-- Add Correios tracking code to orders
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS correios_tracking_code text;
