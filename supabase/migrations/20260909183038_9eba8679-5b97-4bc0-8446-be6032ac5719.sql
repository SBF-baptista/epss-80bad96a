DROP POLICY IF EXISTS "Users with scheduling edit access can manage kit schedules" ON public.kit_schedules;
CREATE POLICY "Users with scheduling edit access can manage kit schedules"
ON public.kit_schedules
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_module_access(auth.uid(), 'scheduling'::app_module, 'edit'::permission_level)
  OR has_module_access(auth.uid(), 'planning'::app_module, 'edit'::permission_level)
  OR has_module_access(auth.uid(), 'kanban'::app_module, 'edit'::permission_level)
  OR has_module_access(auth.uid(), 'orders'::app_module, 'edit'::permission_level)
);