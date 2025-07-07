-- Make usuario_id nullable in pedidos table to allow system orders
ALTER TABLE public.pedidos ALTER COLUMN usuario_id DROP NOT NULL;

-- Add a comment to document system orders
COMMENT ON COLUMN public.pedidos.usuario_id IS 'User ID for manual orders, NULL for system-generated automatic orders';