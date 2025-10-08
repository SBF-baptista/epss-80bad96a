-- Allow trigger/system inserts into kit_schedules so schedules are created when cards move to 'homologado'
DROP POLICY IF EXISTS "System can insert schedules (triggers)" ON public.kit_schedules;
CREATE POLICY "System can insert schedules (triggers)"
ON public.kit_schedules
FOR INSERT
WITH CHECK (auth.uid() IS NULL OR auth.role() = 'service_role');