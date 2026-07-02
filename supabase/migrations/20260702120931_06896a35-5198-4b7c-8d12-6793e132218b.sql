
-- Function: sync a user's module permissions from their access profile
CREATE OR REPLACE FUNCTION public.sync_user_permissions_from_profile(_user_id uuid, _access_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  perms jsonb;
  mod text;
  lvl text;
BEGIN
  IF _access_profile_id IS NULL THEN
    RETURN;
  END IF;

  SELECT permissions INTO perms FROM public.access_profiles WHERE id = _access_profile_id;
  IF perms IS NULL THEN
    RETURN;
  END IF;

  -- Remove existing permissions so profile becomes source of truth
  DELETE FROM public.user_module_permissions WHERE user_id = _user_id;

  FOR mod, lvl IN SELECT key, value FROM jsonb_each_text(perms) LOOP
    IF lvl IS NOT NULL AND lvl <> 'none' THEN
      BEGIN
        INSERT INTO public.user_module_permissions (user_id, module, permission)
        VALUES (_user_id, mod::app_module, lvl::permission_level);
      EXCEPTION WHEN invalid_text_representation OR undefined_object THEN
        -- Skip unknown modules or invalid permission levels
        NULL;
      END;
    END IF;
  END LOOP;
END;
$$;

-- Trigger on user_roles: when a user gets/updates a profile, sync
CREATE OR REPLACE FUNCTION public.trg_sync_user_permissions_on_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_profile_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.access_profile_id IS DISTINCT FROM OLD.access_profile_id) THEN
    PERFORM public.sync_user_permissions_from_profile(NEW.user_id, NEW.access_profile_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_roles_sync_permissions ON public.user_roles;
CREATE TRIGGER user_roles_sync_permissions
AFTER INSERT OR UPDATE OF access_profile_id ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_user_permissions_on_user_roles();

-- Trigger on access_profiles: when a profile's permissions change, resync all users using it
CREATE OR REPLACE FUNCTION public.trg_sync_permissions_on_access_profiles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ur RECORD;
BEGIN
  IF NEW.permissions IS DISTINCT FROM OLD.permissions THEN
    FOR ur IN SELECT user_id FROM public.user_roles WHERE access_profile_id = NEW.id LOOP
      PERFORM public.sync_user_permissions_from_profile(ur.user_id, NEW.id);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS access_profiles_sync_permissions ON public.access_profiles;
CREATE TRIGGER access_profiles_sync_permissions
AFTER UPDATE OF permissions ON public.access_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_permissions_on_access_profiles();

-- Backfill: resync every user that has an access profile
DO $$
DECLARE
  ur RECORD;
BEGIN
  FOR ur IN SELECT user_id, access_profile_id FROM public.user_roles WHERE access_profile_id IS NOT NULL LOOP
    PERFORM public.sync_user_permissions_from_profile(ur.user_id, ur.access_profile_id);
  END LOOP;
END $$;
