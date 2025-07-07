-- Update RLS policies to allow viewing of automatic orders
-- Drop existing policies
DROP POLICY IF EXISTS "Allow service role and user selects" ON pedidos;
DROP POLICY IF EXISTS "Allow service role and user updates" ON pedidos;
DROP POLICY IF EXISTS "Allow service role and user inserts" ON pedidos;

-- Create new policies that allow users to see automatic orders
CREATE POLICY "Users can view their orders and automatic orders" 
ON pedidos 
FOR SELECT 
USING (
  auth.role() = 'service_role'::text 
  OR auth.uid() = usuario_id 
  OR usuario_id IS NULL 
  OR numero_pedido LIKE 'AUTO-%'
);

CREATE POLICY "Users can update their orders and automatic orders" 
ON pedidos 
FOR UPDATE 
USING (
  auth.role() = 'service_role'::text 
  OR auth.uid() = usuario_id 
  OR usuario_id IS NULL 
  OR numero_pedido LIKE 'AUTO-%'
);

CREATE POLICY "Users can insert their orders and system can insert automatic orders" 
ON pedidos 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role'::text 
  OR auth.uid() = usuario_id 
  OR usuario_id IS NULL
);