-- Fix security vulnerability in kit_schedules table by implementing proper access control
-- Current issue: All authenticated users can view all schedules with sensitive customer data

-- Drop the overly permissive existing policies
DROP POLICY IF EXISTS "Authenticated users can view kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Authenticated users can create kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Authenticated users can update kit schedules" ON public.kit_schedules;
DROP POLICY IF EXISTS "Authenticated users can delete kit schedules" ON public.kit_schedules;

-- Create secure policies that restrict access based on user roles and ownership
-- Admins can view all kit schedules
CREATE POLICY "Admins can view all kit schedules" 
ON public.kit_schedules 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can only view schedules they created
CREATE POLICY "Users can view their own kit schedules" 
ON public.kit_schedules 
FOR SELECT 
USING (auth.uid() = created_by);

-- Technicians can view schedules assigned to them
CREATE POLICY "Technicians can view assigned kit schedules" 
ON public.kit_schedules 
FOR SELECT 
USING (
  public.has_role(auth.uid(), 'installer'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.technicians 
    WHERE technicians.id = kit_schedules.technician_id 
    AND technicians.created_by = auth.uid()
  )
);

-- Users can create kit schedules (must set created_by to their own ID)
CREATE POLICY "Users can create kit schedules" 
ON public.kit_schedules 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'authenticated'::text) 
  AND (auth.uid() = created_by)
);

-- Admins can update any kit schedule
CREATE POLICY "Admins can update any kit schedules" 
ON public.kit_schedules 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can only update schedules they created
CREATE POLICY "Users can update their own kit schedules" 
ON public.kit_schedules 
FOR UPDATE 
USING (auth.uid() = created_by);

-- Admins can delete any kit schedule
CREATE POLICY "Admins can delete any kit schedules" 
ON public.kit_schedules 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Users can only delete schedules they created
CREATE POLICY "Users can delete their own kit schedules" 
ON public.kit_schedules 
FOR DELETE 
USING (auth.uid() = created_by);