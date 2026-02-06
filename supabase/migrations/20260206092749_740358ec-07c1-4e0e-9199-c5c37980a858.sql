-- Grant execute permissions for History RPC
GRANT EXECUTE ON FUNCTION public.get_app_logs_admin(text, text, timestamptz, timestamptz) TO authenticated;

-- Optional: keep anon blocked (default), but be explicit
REVOKE EXECUTE ON FUNCTION public.get_app_logs_admin(text, text, timestamptz, timestamptz) FROM anon;
