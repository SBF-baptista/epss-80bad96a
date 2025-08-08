-- Add policy to allow admins to view all orders in pedidos
CREATE POLICY "Admins can view all orders"
ON public.pedidos
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));