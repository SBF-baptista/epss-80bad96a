-- 1. Tabelas
CREATE TABLE public.access_profile_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  module public.app_module NOT NULL,
  level public.permission_level NOT NULL DEFAULT 'none',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, module)
);

GRANT SELECT ON public.access_profile_permissions TO authenticated;
GRANT ALL ON public.access_profile_permissions TO service_role;
ALTER TABLE public.access_profile_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read profile permissions"
  ON public.access_profile_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage profile permissions"
  ON public.access_profile_permissions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TABLE public.user_permission_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module public.app_module NOT NULL,
  level public.permission_level NOT NULL,
  justification text,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module)
);

GRANT SELECT ON public.user_permission_overrides TO authenticated;
GRANT ALL ON public.user_permission_overrides TO service_role;
ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own overrides"
  ON public.user_permission_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins manage overrides"
  ON public.user_permission_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_app_profile_perms_updated_at
  BEFORE UPDATE ON public.access_profile_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_perm_overrides_updated_at
  BEFORE UPDATE ON public.user_permission_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_app_profile_perms_profile ON public.access_profile_permissions(profile_id);
CREATE INDEX idx_user_perm_overrides_user ON public.user_permission_overrides(user_id);

-- 2. Congela a sincronizacao legada
DROP TRIGGER IF EXISTS access_profiles_sync_permissions ON public.access_profiles;
DROP TRIGGER IF EXISTS user_roles_sync_permissions ON public.user_roles;

-- 3. Novo calculo de permissao: perfil + override, admin vence tudo
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
      (SELECT MAX(p.level::text)::public.permission_level FROM public.access_profile_permissions p
        JOIN public.user_roles ur ON ur.access_profile_id = p.profile_id
        WHERE ur.user_id = _user_id AND p.module = _module AND p.level <> 'none'),
      'none'::public.permission_level
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.can_view_module(_user_id uuid, _module public.app_module)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.get_module_permission(_user_id, _module) IN ('view','edit','approve','admin') $$;

CREATE OR REPLACE FUNCTION public.can_edit_module(_user_id uuid, _module public.app_module)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.get_module_permission(_user_id, _module) IN ('edit','approve','admin') $$;

CREATE OR REPLACE FUNCTION public.can_approve_module(_user_id uuid, _module public.app_module)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT public.get_module_permission(_user_id, _module) IN ('approve','admin') $$;

CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module public.app_module, _min_permission public.permission_level)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT CASE _min_permission
    WHEN 'none' THEN true
    WHEN 'view' THEN public.can_view_module(_user_id, _module)
    WHEN 'edit' THEN public.can_edit_module(_user_id, _module)
    WHEN 'approve' THEN public.can_approve_module(_user_id, _module)
    WHEN 'admin' THEN public.get_module_permission(_user_id, _module) = 'admin'
    ELSE false
  END
$$;