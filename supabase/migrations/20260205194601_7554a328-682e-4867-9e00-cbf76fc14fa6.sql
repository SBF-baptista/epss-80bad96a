-- Drop both versions of the function to resolve the conflict
DROP FUNCTION IF EXISTS public.get_app_logs_admin(text, text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS public.get_app_logs_admin(text, text, timestamp with time zone, timestamp with time zone, text, text, text, text, boolean, text);

-- Create a single unified function
CREATE OR REPLACE FUNCTION public.get_app_logs_admin(
  p_module TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  user_profile TEXT,
  action TEXT,
  action_type log_action_type,
  module TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  details TEXT,
  previous_state JSONB,
  new_state JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  device_info TEXT,
  browser_info TEXT,
  origin log_origin,
  status log_status,
  impact_level log_impact_level,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  is_critical BOOLEAN,
  is_reversible BOOLEAN,
  is_lgpd_sensitive BOOLEAN,
  session_id TEXT,
  environment TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.created_at,
    l.user_id,
    COALESCE(u.email, 'Sistema') as user_email,
    l.user_role,
    l.user_profile,
    l.action,
    l.action_type,
    l.module,
    l.entity_type,
    l.entity_id,
    l.entity_name,
    l.details,
    l.previous_state,
    l.new_state,
    l.changed_fields,
    l.ip_address,
    l.device_info,
    l.browser_info,
    l.origin,
    l.status,
    l.impact_level,
    l.error_code,
    l.error_message,
    l.duration_ms,
    l.is_critical,
    l.is_reversible,
    l.is_lgpd_sensitive,
    l.session_id,
    l.environment
  FROM app_logs l
  LEFT JOIN auth.users u ON l.user_id = u.id
  WHERE
    (p_module IS NULL OR l.module = p_module)
    AND (p_action IS NULL OR l.action ILIKE '%' || p_action || '%')
    AND (p_start_date IS NULL OR l.created_at >= p_start_date)
    AND (p_end_date IS NULL OR l.created_at <= p_end_date)
  ORDER BY l.created_at DESC
  LIMIT 1000;
END;
$$;