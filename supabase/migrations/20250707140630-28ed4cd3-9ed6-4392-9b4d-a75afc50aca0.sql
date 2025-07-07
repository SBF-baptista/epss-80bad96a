-- Update RLS policies to allow system orders (where usuario_id is NULL)

-- Update pedidos policies
DROP POLICY IF EXISTS "Usuários podem ver seus próprios pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem criar seus próprios pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios pedidos" ON public.pedidos;

-- Create new policies that handle both user orders and system orders
CREATE POLICY "Users can view their own orders and system orders" 
ON public.pedidos FOR SELECT 
USING (auth.uid() = usuario_id OR usuario_id IS NULL);

CREATE POLICY "Users can create their own orders, system can create automatic orders" 
ON public.pedidos FOR INSERT 
WITH CHECK (auth.uid() = usuario_id OR usuario_id IS NULL);

CREATE POLICY "Users can update their own orders, system can update automatic orders" 
ON public.pedidos FOR UPDATE 
USING (auth.uid() = usuario_id OR usuario_id IS NULL);

CREATE POLICY "Users can delete their own orders" 
ON public.pedidos FOR DELETE 
USING (auth.uid() = usuario_id);

-- Update veiculos policies to handle system orders
DROP POLICY IF EXISTS "Usuários podem ver veículos de seus pedidos" ON public.veiculos;
DROP POLICY IF EXISTS "Usuários podem inserir veículos em seus pedidos" ON public.veiculos;
DROP POLICY IF EXISTS "Usuários podem atualizar veículos de seus pedidos" ON public.veiculos;
DROP POLICY IF EXISTS "Usuários podem deletar veículos de seus pedidos" ON public.veiculos;

CREATE POLICY "Users can view vehicles from their orders and system orders" 
ON public.veiculos FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = veiculos.pedido_id 
  AND (pedidos.usuario_id = auth.uid() OR pedidos.usuario_id IS NULL)
));

CREATE POLICY "Users can insert vehicles in their orders, system can insert in automatic orders" 
ON public.veiculos FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = veiculos.pedido_id 
  AND (pedidos.usuario_id = auth.uid() OR pedidos.usuario_id IS NULL)
));

CREATE POLICY "Users can update vehicles from their orders, system can update automatic orders" 
ON public.veiculos FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = veiculos.pedido_id 
  AND (pedidos.usuario_id = auth.uid() OR pedidos.usuario_id IS NULL)
));

CREATE POLICY "Users can delete vehicles from their orders" 
ON public.veiculos FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = veiculos.pedido_id 
  AND pedidos.usuario_id = auth.uid()
));

-- Update rastreadores policies to handle system orders
DROP POLICY IF EXISTS "Usuários podem ver rastreadores de seus pedidos" ON public.rastreadores;
DROP POLICY IF EXISTS "Usuários podem inserir rastreadores em seus pedidos" ON public.rastreadores;
DROP POLICY IF EXISTS "Usuários podem atualizar rastreadores de seus pedidos" ON public.rastreadores;
DROP POLICY IF EXISTS "Usuários podem deletar rastreadores de seus pedidos" ON public.rastreadores;

CREATE POLICY "Users can view trackers from their orders and system orders" 
ON public.rastreadores FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = rastreadores.pedido_id 
  AND (pedidos.usuario_id = auth.uid() OR pedidos.usuario_id IS NULL)
));

CREATE POLICY "Users can insert trackers in their orders, system can insert in automatic orders" 
ON public.rastreadores FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = rastreadores.pedido_id 
  AND (pedidos.usuario_id = auth.uid() OR pedidos.usuario_id IS NULL)
));

CREATE POLICY "Users can update trackers from their orders, system can update automatic orders" 
ON public.rastreadores FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = rastreadores.pedido_id 
  AND (pedidos.usuario_id = auth.uid() OR pedidos.usuario_id IS NULL)
));

CREATE POLICY "Users can delete trackers from their orders" 
ON public.rastreadores FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM pedidos 
  WHERE pedidos.id = rastreadores.pedido_id 
  AND pedidos.usuario_id = auth.uid()
));