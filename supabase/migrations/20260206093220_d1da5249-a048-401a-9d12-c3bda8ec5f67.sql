-- Recriar a função get_app_logs_admin com cast explícito para TEXT
-- Corrige ERROR 42804: "Returned type character varying does not match expected type text"

CREATE OR REPLACE FUNCTION public.get_app_logs_admin(
  p_module text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  created_at timestamp with time zone,
  user_id uuid,
  user_email text,
  user_role text,
  user_profile text,
  action text,
  action_type log_action_type,
  module text,
  entity_type text,
  entity_id text,
  entity_name text,
  details text,
  previous_state jsonb,
  new_state jsonb,
  changed_fields text[],
  ip_address text,
  device_info text,
  browser_info text,
  origin log_origin,
  status log_status,
  impact_level log_impact_level,
  error_code text,
  error_message text,
  duration_ms integer,
  is_critical boolean,
  is_reversible boolean,
  is_lgpd_sensitive boolean,
  session_id text,
  environment text
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
    COALESCE(u.email::text, 'Sistema'::text)::text as user_email,
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

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.get_app_logs_admin(text, text, timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.get_app_logs_admin(text, text, timestamptz, timestamptz) FROM anon;