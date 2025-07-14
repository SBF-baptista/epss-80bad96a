-- Add pedido_id column to accessories table to support manual orders
ALTER TABLE public.accessories 
ADD COLUMN pedido_id UUID REFERENCES public.pedidos(id);

-- Make incoming_vehicle_group_id nullable since manual orders won't have this
ALTER TABLE public.accessories 
ALTER COLUMN incoming_vehicle_group_id DROP NOT NULL;

-- Make company_name nullable since it can be derived from order
ALTER TABLE public.accessories 
ALTER COLUMN company_name DROP NOT NULL;

-- Make usage_type nullable for manual orders
ALTER TABLE public.accessories 
ALTER COLUMN usage_type DROP NOT NULL;

-- Update RLS policies to allow order-based access
CREATE POLICY "Users can create accessories for their orders" 
ON public.accessories 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = accessories.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ) 
  OR auth.role() = 'service_role'::text
);

CREATE POLICY "Users can view accessories from their orders" 
ON public.accessories 
FOR SELECT 
USING (
  (pedido_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = accessories.pedido_id 
    AND (pedidos.usuario_id = auth.uid() OR pedidos.numero_pedido LIKE 'AUTO-%')
  ))
  OR (pedido_id IS NULL) -- For incoming vehicle accessories
);

CREATE POLICY "Users can update accessories from their orders" 
ON public.accessories 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos 
    WHERE pedidos.id = accessories.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  ) 
  OR auth.role() = 'service_role'::text
);