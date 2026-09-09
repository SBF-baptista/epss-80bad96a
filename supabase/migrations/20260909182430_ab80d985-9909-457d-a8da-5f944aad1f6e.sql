DROP POLICY IF EXISTS "Users with scheduling view access can view kit schedules" ON public.kit_schedules;
CREATE POLICY "Users with scheduling view access can view kit schedules"
ON public.kit_schedules FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_module_access(auth.uid(), 'scheduling'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'planning'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'customer_tracking'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'kanban'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'orders'::app_module, 'view'::permission_level)
);