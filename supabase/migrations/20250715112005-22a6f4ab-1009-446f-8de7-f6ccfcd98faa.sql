-- Add policy for admins to delete any order
CREATE POLICY "Admins can delete any order" 
ON pedidos 
FOR DELETE 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role));