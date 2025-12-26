-- Add RLS policy for authorized roles to view vehicles from enviado orders
CREATE POLICY "Authorized roles can view vehicles from enviado orders" 
ON public.veiculos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = veiculos.pedido_id 
    AND pedidos.status = 'enviado'
    AND (
      has_role(auth.uid(), 'operador_agendamento'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'gestor'::app_role)
    )
  )
);

-- Add RLS policy for authorized roles to view trackers from enviado orders
CREATE POLICY "Authorized roles can view trackers from enviado orders" 
ON public.rastreadores 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM pedidos 
    WHERE pedidos.id = rastreadores.pedido_id 
    AND pedidos.status = 'enviado'
    AND (
      has_role(auth.uid(), 'operador_agendamento'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'gestor'::app_role)
    )
  )
);