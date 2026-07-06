
-- Teams table: groups of users with their own module permissions
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone authenticated can view teams"
ON public.teams FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins manage teams"
ON public.teams FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link users to a single team via user_roles
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_roles_team_id ON public.user_roles(team_id);

-- Extend has_module_access to also honor team permissions
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module app_module, _min_permission permission_level)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    public.has_role(_user_id, 'admin'::app_role)
    OR (public.has_role(_user_id, 'gestor'::app_role) AND _min_permission IN ('view', 'edit'))
    OR EXISTS (
      SELECT 1 FROM public.user_module_permissions ump
      WHERE ump.user_id = _user_id AND ump.module = _module
        AND (CASE _min_permission
          WHEN 'none' THEN ump.permission IN ('none','view','edit','approve','admin')
          WHEN 'view' THEN ump.permission IN ('view','edit','approve','admin')
          WHEN 'edit' THEN ump.permission IN ('edit','approve','admin')
          WHEN 'approve' THEN ump.permission IN ('approve','admin')
          WHEN 'admin' THEN ump.permission = 'admin'
          ELSE false END)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.access_profiles ap ON ap.id = ur.access_profile_id
      WHERE ur.user_id = _user_id AND ur.access_profile_id IS NOT NULL
        AND (CASE _min_permission
          WHEN 'none' THEN (ap.permissions ->> _module::text) IN ('none','view','edit','approve','admin')
          WHEN 'view' THEN (ap.permissions ->> _module::text) IN ('view','edit','approve','admin')
          WHEN 'edit' THEN (ap.permissions ->> _module::text) IN ('edit','approve','admin')
          WHEN 'approve' THEN (ap.permissions ->> _module::text) IN ('approve','admin')
          WHEN 'admin' THEN (ap.permissions ->> _module::text) = 'admin'
          ELSE false END)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.teams t ON t.id = ur.team_id
      WHERE ur.user_id = _user_id AND ur.team_id IS NOT NULL
        AND (CASE _min_permission
          WHEN 'none' THEN (t.permissions ->> _module::text) IN ('none','view','edit','approve','admin')
          WHEN 'view' THEN (t.permissions ->> _module::text) IN ('view','edit','approve','admin')
          WHEN 'edit' THEN (t.permissions ->> _module::text) IN ('edit','approve','admin')
          WHEN 'approve' THEN (t.permissions ->> _module::text) IN ('approve','admin')
          WHEN 'admin' THEN (t.permissions ->> _module::text) = 'admin'
          ELSE false END)
    )
$function$;
