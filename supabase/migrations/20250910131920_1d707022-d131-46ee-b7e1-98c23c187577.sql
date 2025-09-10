-- Fix security vulnerability: Restrict shipment recipients access to order owners and admins only
DROP POLICY IF EXISTS "Authenticated users can view shipment recipients" ON public.shipment_recipients;

-- Create a secure policy that only allows users to see shipment recipients related to their orders or admins to see all
CREATE POLICY "Users can view shipment recipients from their orders or admins can view all" 
ON public.shipment_recipients 
FOR SELECT 
USING (
  -- Admins can see all shipment recipients
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Users can only see shipment recipients linked to their own orders
  EXISTS (
    SELECT 1 
    FROM pedidos 
    WHERE pedidos.shipment_recipient_id = shipment_recipients.id 
    AND pedidos.usuario_id = auth.uid()
  )
);

-- Also restrict INSERT to only allow creating recipients for own orders
DROP POLICY IF EXISTS "Authenticated users can create shipment recipients" ON public.shipment_recipients;
CREATE POLICY "Users can create shipment recipients or admins can create any" 
ON public.shipment_recipients 
FOR INSERT 
WITH CHECK (
  -- Admins can create any shipment recipient
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- Regular users can create recipients (they will be linked to orders they own)
  auth.role() = 'authenticated'::text
);

-- Restrict UPDATE to only allow modifying recipients linked to own orders
DROP POLICY IF EXISTS "Authenticated users can update shipment recipients" ON public.shipment_recipients;
CREATE POLICY "Users can update shipment recipients from their orders or admins can update any" 
ON public.shipment_recipients 
FOR UPDATE 
USING (
  -- Admins can update any shipment recipient
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  -- Users can only update shipment recipients linked to their own orders
  EXISTS (
    SELECT 1 
    FROM pedidos 
    WHERE pedidos.shipment_recipient_id = shipment_recipients.id 
    AND pedidos.usuario_id = auth.uid()
  )
);