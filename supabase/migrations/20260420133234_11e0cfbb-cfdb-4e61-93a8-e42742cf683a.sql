
-- Fix 1: has_module_access also reads from access_profiles.permissions
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module app_module, _min_permission permission_level)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    -- Admin always has access
    public.has_role(_user_id, 'admin'::app_role)
    OR
    -- Gestor always has view access
    (public.has_role(_user_id, 'gestor'::app_role) AND _min_permission IN ('view', 'edit'))
    OR
    -- Check legacy user_module_permissions table
    EXISTS (
      SELECT 1
      FROM public.user_module_permissions ump
      WHERE ump.user_id = _user_id
        AND ump.module = _module
        AND (
          CASE _min_permission
            WHEN 'none' THEN ump.permission IN ('none', 'view', 'edit', 'approve', 'admin')
            WHEN 'view' THEN ump.permission IN ('view', 'edit', 'approve', 'admin')
            WHEN 'edit' THEN ump.permission IN ('edit', 'approve', 'admin')
            WHEN 'approve' THEN ump.permission IN ('approve', 'admin')
            WHEN 'admin' THEN ump.permission = 'admin'
            ELSE false
          END
        )
    )
    OR
    -- Check access_profiles.permissions (JSON) attached via user_roles.access_profile_id
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.access_profiles ap ON ap.id = ur.access_profile_id
      WHERE ur.user_id = _user_id
        AND ur.access_profile_id IS NOT NULL
        AND (
          CASE _min_permission
            WHEN 'none' THEN (ap.permissions ->> _module::text) IN ('none', 'view', 'edit', 'approve', 'admin')
            WHEN 'view' THEN (ap.permissions ->> _module::text) IN ('view', 'edit', 'approve', 'admin')
            WHEN 'edit' THEN (ap.permissions ->> _module::text) IN ('edit', 'approve', 'admin')
            WHEN 'approve' THEN (ap.permissions ->> _module::text) IN ('approve', 'admin')
            WHEN 'admin' THEN (ap.permissions ->> _module::text) = 'admin'
            ELSE false
          END
        )
    )
$function$;

-- Fix 2: incoming_vehicles RLS also allows customer_tracking and planning view
DROP POLICY IF EXISTS "Users with kickoff view access can view incoming vehicles" ON public.incoming_vehicles;

CREATE POLICY "Users with operational view access can view incoming vehicles"
ON public.incoming_vehicles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR has_module_access(auth.uid(), 'kickoff'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'customer_tracking'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'planning'::app_module, 'view'::permission_level)
  OR has_module_access(auth.uid(), 'scheduling'::app_module, 'view'::permission_level)
);
