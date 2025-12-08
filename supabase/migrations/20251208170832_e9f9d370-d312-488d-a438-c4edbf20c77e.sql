-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their orders and automatic orders" ON pedidos;

-- Create a new PERMISSIVE SELECT policy (default is PERMISSIVE when not specified)
CREATE POLICY "Users can view their orders and automatic orders"
ON pedidos
FOR SELECT
USING (
  (auth.uid() = usuario_id) 
  OR (usuario_id IS NULL) 
  OR (numero_pedido LIKE 'AUTO-%')
);