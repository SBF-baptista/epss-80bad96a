ALTER TABLE public.access_profile_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.user_permission_overrides REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='access_profile_permissions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.access_profile_permissions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='user_permission_overrides') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permission_overrides;
  END IF;
END $$;