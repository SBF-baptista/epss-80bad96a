CREATE POLICY "Kickoff editors can create homologation cards"
ON public.homologation_cards
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
  OR has_module_access(auth.uid(), 'kickoff'::app_module, 'edit'::permission_level)
);