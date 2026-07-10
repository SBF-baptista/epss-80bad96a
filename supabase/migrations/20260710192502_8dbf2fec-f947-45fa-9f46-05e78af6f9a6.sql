
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.access_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_module_permissions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_module_permissions;
