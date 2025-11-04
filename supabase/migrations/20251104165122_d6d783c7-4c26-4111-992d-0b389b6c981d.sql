-- Create RPC function to get app logs with user emails for admin users
CREATE OR REPLACE FUNCTION public.get_app_logs_admin(
  p_module text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  action text,
  module text,
  details text,
  ip_address text,
  created_at timestamptz,
  user_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return logs with user emails
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.action,
    al.module,
    al.details,
    al.ip_address,
    al.created_at,
    COALESCE(u.email, 'Sistema') as user_email
  FROM public.app_logs al
  LEFT JOIN public.usuarios u ON u.id = al.user_id
  WHERE
    (p_module IS NULL OR al.module = p_module)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
  ORDER BY al.created_at DESC
  LIMIT 1000;
END;
$$;