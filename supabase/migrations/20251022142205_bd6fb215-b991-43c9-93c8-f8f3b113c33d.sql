-- Add missing SELECT policy for incoming_vehicles
-- This allows authenticated users to view incoming vehicles data (needed for Kickoff page)

CREATE POLICY "Authenticated users can view incoming vehicles"
ON public.incoming_vehicles FOR SELECT
TO authenticated
USING (true);