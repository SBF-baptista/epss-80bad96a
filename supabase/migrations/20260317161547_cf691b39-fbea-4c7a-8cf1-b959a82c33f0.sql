CREATE POLICY "Authenticated users can delete technicians"
ON public.technicians
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated'::text);