-- Allow trigger/system to SELECT data needed for automatic scheduling
-- Incoming vehicles: allow system select
DROP POLICY IF EXISTS "System can select incoming vehicles (triggers)" ON public.incoming_vehicles;
CREATE POLICY "System can select incoming vehicles (triggers)"
ON public.incoming_vehicles
FOR SELECT
USING (
  auth.uid() IS NULL OR auth.role() = 'service_role'
);

-- Customers: allow system select and update (for vehicles array update)
DROP POLICY IF EXISTS "System can view customers (triggers)" ON public.customers;
CREATE POLICY "System can view customers (triggers)"
ON public.customers
FOR SELECT
USING (
  auth.uid() IS NULL OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "System can update customers (triggers)" ON public.customers;
CREATE POLICY "System can update customers (triggers)"
ON public.customers
FOR UPDATE
USING (
  auth.uid() IS NULL OR auth.role() = 'service_role'
);

-- Homologation kits: allow system select
DROP POLICY IF EXISTS "System can view homologation kits (triggers)" ON public.homologation_kits;
CREATE POLICY "System can view homologation kits (triggers)"
ON public.homologation_kits
FOR SELECT
USING (
  auth.uid() IS NULL OR auth.role() = 'service_role'
);

-- Technicians: allow system select
DROP POLICY IF EXISTS "System can view technicians (triggers)" ON public.technicians;
CREATE POLICY "System can view technicians (triggers)"
ON public.technicians
FOR SELECT
USING (
  auth.uid() IS NULL OR auth.role() = 'service_role'
);
