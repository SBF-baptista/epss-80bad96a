-- Fix RLS policies for kickoff_history and kit_schedules
-- This allows authenticated users to create records in these tables

-- 1. Add INSERT policy for kickoff_history (CRITICAL FIX)
-- This enables the "Realizar Kickoff" button to work
CREATE POLICY "Authenticated users can create kickoff history"
ON public.kickoff_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Add INSERT policy for kit_schedules (PREVENTIVE FIX)
-- This ensures authenticated users can create schedules directly
CREATE POLICY "Authenticated users can create kit schedules"
ON public.kit_schedules FOR INSERT
TO authenticated
WITH CHECK (true);