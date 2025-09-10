-- Fix security vulnerability: Restrict shipment recipients access to authenticated users only
DROP POLICY IF EXISTS "Users can view all shipment recipients" ON public.shipment_recipients;

-- Create a secure policy that only allows authenticated users to view shipment recipients
CREATE POLICY "Authenticated users can view shipment recipients" 
ON public.shipment_recipients 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);