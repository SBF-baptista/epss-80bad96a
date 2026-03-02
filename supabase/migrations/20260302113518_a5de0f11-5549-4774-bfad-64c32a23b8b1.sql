
-- Allow users with kickoff edit access to update kickoff history records
CREATE POLICY "Users with kickoff edit access can update kickoff history"
ON public.kickoff_history
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level)
);
