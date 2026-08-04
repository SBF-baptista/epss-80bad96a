CREATE OR REPLACE FUNCTION public.get_module_permission(_user_id uuid, _module public.app_module)
RETURNS public.permission_level
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin'::public.app_role) THEN 'admin'::public.permission_level
    ELSE COALESCE(
      (SELECT o.level FROM public.user_permission_overrides o
        WHERE o.user_id = _user_id AND o.module = _module),
      (SELECT p.level FROM public.access_profile_permissions p
        JOIN public.user_roles ur ON ur.access_profile_id = p.profile_id
        WHERE ur.user_id = _user_id AND p.module = _module AND p.level <> 'none'
        ORDER BY p.level DESC LIMIT 1),
      'none'::public.permission_level
    )
  END
$$;