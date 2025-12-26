-- Add RLS policy for operador_agendamento to view all orders with status 'enviado'
CREATE POLICY "Operador agendamento can view enviado orders" 
ON public.pedidos 
FOR SELECT 
USING (
  has_role(auth.uid(), 'operador_agendamento'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'gestor'::app_role)
);