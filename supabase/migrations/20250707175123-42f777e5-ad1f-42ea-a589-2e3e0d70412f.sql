-- Update RLS policies for vehicles and trackers to allow viewing automatic orders
-- Drop existing policies for veiculos table
DROP POLICY IF EXISTS "Users can view vehicles from their orders and system orders" ON veiculos;
DROP POLICY IF EXISTS "Users can insert vehicles in their orders, system can insert in" ON veiculos;
DROP POLICY IF EXISTS "Users can update vehicles from their orders, system can update" ON veiculos;
DROP POLICY IF EXISTS "Users can delete vehicles from their orders" ON veiculos;

-- Create new policies for veiculos table
CREATE POLICY "Users can view vehicles from their orders and automatic orders" 
ON veiculos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND (
      pedidos.usuario_id = auth.uid() 
      OR pedidos.usuario_id IS NULL 
      OR pedidos.numero_pedido LIKE 'AUTO-%'
      OR auth.role() = 'service_role'::text
    )
  )
);

CREATE POLICY "Users can insert vehicles in their orders and system can insert automatic" 
ON veiculos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND (
      pedidos.usuario_id = auth.uid() 
      OR pedidos.usuario_id IS NULL 
      OR auth.role() = 'service_role'::text
    )
  )
);

CREATE POLICY "Users can update vehicles from their orders and system can update automatic" 
ON veiculos 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND (
      pedidos.usuario_id = auth.uid() 
      OR pedidos.usuario_id IS NULL 
      OR auth.role() = 'service_role'::text
    )
  )
);

CREATE POLICY "Users can delete vehicles from their orders" 
ON veiculos 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  )
);

-- Drop existing policies for rastreadores table
DROP POLICY IF EXISTS "Users can view trackers from their orders and system orders" ON rastreadores;
DROP POLICY IF EXISTS "Users can insert trackers in their orders, system can insert in" ON rastreadores;
DROP POLICY IF EXISTS "Users can update trackers from their orders, system can update" ON rastreadores;
DROP POLICY IF EXISTS "Users can delete trackers from their orders" ON rastreadores;

-- Create new policies for rastreadores table
CREATE POLICY "Users can view trackers from their orders and automatic orders" 
ON rastreadores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND (
      pedidos.usuario_id = auth.uid() 
      OR pedidos.usuario_id IS NULL 
      OR pedidos.numero_pedido LIKE 'AUTO-%'
      OR auth.role() = 'service_role'::text
    )
  )
);

CREATE POLICY "Users can insert trackers in their orders and system can insert automatic" 
ON rastreadores 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND (
      pedidos.usuario_id = auth.uid() 
      OR pedidos.usuario_id IS NULL 
      OR auth.role() = 'service_role'::text
    )
  )
);

CREATE POLICY "Users can update trackers from their orders and system can update automatic" 
ON rastreadores 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND (
      pedidos.usuario_id = auth.uid() 
      OR pedidos.usuario_id IS NULL 
      OR auth.role() = 'service_role'::text
    )
  )
);

CREATE POLICY "Users can delete trackers from their orders" 
ON rastreadores 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND pedidos.usuario_id = auth.uid()
  )
);