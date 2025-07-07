-- Update RLS policies to properly handle service role inserts for automatic orders

-- Drop existing pedidos policies
DROP POLICY IF EXISTS "Users can create their own orders, system can create automatic orders" ON public.pedidos;
DROP POLICY IF EXISTS "Users can view their own orders and system orders" ON public.pedidos;
DROP POLICY IF EXISTS "Users can update their own orders, system can update automatic orders" ON public.pedidos;
DROP POLICY IF EXISTS "Users can delete their own orders" ON public.pedidos;

-- Create new policies that properly handle service role and system orders
CREATE POLICY "Allow service role and user inserts" 
ON public.pedidos FOR INSERT 
WITH CHECK (
  -- Service role can insert anything
  auth.role() = 'service_role'
  OR 
  -- Authenticated users can insert their own orders
  (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
  OR
  -- Allow system orders (NULL user_id) for authenticated users
  (auth.role() = 'authenticated' AND usuario_id IS NULL)
);

CREATE POLICY "Allow service role and user selects" 
ON public.pedidos FOR SELECT 
USING (
  -- Service role can see everything
  auth.role() = 'service_role'
  OR 
  -- Users can see their own orders and system orders
  (auth.role() = 'authenticated' AND (auth.uid() = usuario_id OR usuario_id IS NULL))
);

CREATE POLICY "Allow service role and user updates" 
ON public.pedidos FOR UPDATE 
USING (
  -- Service role can update anything
  auth.role() = 'service_role'
  OR 
  -- Users can update their own orders and system orders
  (auth.role() = 'authenticated' AND (auth.uid() = usuario_id OR usuario_id IS NULL))
);

CREATE POLICY "Users can delete their own orders" 
ON public.pedidos FOR DELETE 
USING (
  -- Service role can delete anything
  auth.role() = 'service_role'
  OR 
  -- Users can only delete their own orders (not system orders)
  (auth.role() = 'authenticated' AND auth.uid() = usuario_id)
);