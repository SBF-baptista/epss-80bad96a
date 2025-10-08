-- Add RLS policy to allow system/trigger to create customers
CREATE POLICY "System can create customers (triggers)"
ON public.customers
FOR INSERT
WITH CHECK (
  auth.uid() IS NULL 
  OR auth.role() = 'service_role'
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'order_manager'::app_role)
);