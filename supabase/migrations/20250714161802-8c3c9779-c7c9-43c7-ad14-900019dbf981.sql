-- Add vehicle_id column to accessories table to allow accessories per vehicle
ALTER TABLE public.accessories 
ADD COLUMN vehicle_id uuid;

-- Add foreign key constraint to link accessories to incoming_vehicles
ALTER TABLE public.accessories 
ADD CONSTRAINT accessories_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) REFERENCES public.incoming_vehicles(id);

-- Update RLS policies to handle vehicle-level accessories
DROP POLICY IF EXISTS "Users can view accessories from their orders" ON public.accessories;

CREATE POLICY "Users can view accessories from their orders and vehicle accessories" 
ON public.accessories 
FOR SELECT 
USING (
  (pedido_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = accessories.pedido_id 
    AND (pedidos.usuario_id = auth.uid() OR pedidos.numero_pedido LIKE 'AUTO-%')
  )) 
  OR 
  (vehicle_id IS NOT NULL AND TRUE) -- Allow viewing vehicle-level accessories
  OR 
  (pedido_id IS NULL AND incoming_vehicle_group_id IS NOT NULL) -- Group-level accessories
);