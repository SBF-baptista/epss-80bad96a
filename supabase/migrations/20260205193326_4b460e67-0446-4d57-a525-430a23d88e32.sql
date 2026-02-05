-- =====================================================
-- ENHANCED APP_LOGS TABLE FOR COMPLETE AUDIT TRAIL
-- =====================================================

-- Create enum for action types
DO $$ BEGIN
  CREATE TYPE public.log_action_type AS ENUM (
    'create',
    'update', 
    'delete',
    'login',
    'logout',
    'approval',
    'rejection',
    'cancellation',
    'integration',
    'system',
    'error',
    'access'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for action origin
DO $$ BEGIN
  CREATE TYPE public.log_origin AS ENUM (
    'web',
    'api',
    'integration',
    'system',
    'mobile',
    'job',
    'webhook'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for impact level
DO $$ BEGIN
  CREATE TYPE public.log_impact_level AS ENUM (
    'info',
    'low',
    'medium',
    'high',
    'critical'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create enum for action status
DO $$ BEGIN
  CREATE TYPE public.log_status AS ENUM (
    'success',
    'error',
    'partial',
    'pending'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to app_logs table
ALTER TABLE public.app_logs
ADD COLUMN IF NOT EXISTS action_type public.log_action_type DEFAULT 'system',
ADD COLUMN IF NOT EXISTS origin public.log_origin DEFAULT 'web',
ADD COLUMN IF NOT EXISTS impact_level public.log_impact_level DEFAULT 'low',
ADD COLUMN IF NOT EXISTS status public.log_status DEFAULT 'success',
ADD COLUMN IF NOT EXISTS entity_type TEXT,
ADD COLUMN IF NOT EXISTS entity_id TEXT,
ADD COLUMN IF NOT EXISTS entity_name TEXT,
ADD COLUMN IF NOT EXISTS previous_state JSONB,
ADD COLUMN IF NOT EXISTS new_state JSONB,
ADD COLUMN IF NOT EXISTS changed_fields TEXT[],
ADD COLUMN IF NOT EXISTS error_code TEXT,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS device_info TEXT,
ADD COLUMN IF NOT EXISTS browser_info TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS is_lgpd_sensitive BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_reversible BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production',
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS user_role TEXT,
ADD COLUMN IF NOT EXISTS user_profile TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_app_logs_action_type ON public.app_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_app_logs_origin ON public.app_logs(origin);
CREATE INDEX IF NOT EXISTS idx_app_logs_impact_level ON public.app_logs(impact_level);
CREATE INDEX IF NOT EXISTS idx_app_logs_status ON public.app_logs(status);
CREATE INDEX IF NOT EXISTS idx_app_logs_entity_type ON public.app_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_app_logs_entity_id ON public.app_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_app_logs_is_critical ON public.app_logs(is_critical);
CREATE INDEX IF NOT EXISTS idx_app_logs_is_lgpd_sensitive ON public.app_logs(is_lgpd_sensitive);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON public.app_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_logs_user_module ON public.app_logs(user_id, module);

-- Update the log_action function to accept new parameters
CREATE OR REPLACE FUNCTION public.log_action_extended(
  p_action TEXT,
  p_module TEXT,
  p_details TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_action_type public.log_action_type DEFAULT 'system',
  p_origin public.log_origin DEFAULT 'web',
  p_impact_level public.log_impact_level DEFAULT 'low',
  p_status public.log_status DEFAULT 'success',
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_entity_name TEXT DEFAULT NULL,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_changed_fields TEXT[] DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_device_info TEXT DEFAULT NULL,
  p_browser_info TEXT DEFAULT NULL,
  p_is_lgpd_sensitive BOOLEAN DEFAULT FALSE,
  p_is_critical BOOLEAN DEFAULT FALSE,
  p_is_reversible BOOLEAN DEFAULT TRUE,
  p_duration_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get user role if authenticated
  SELECT role::TEXT INTO v_user_role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  INSERT INTO public.app_logs (
    user_id,
    action,
    module,
    details,
    ip_address,
    action_type,
    origin,
    impact_level,
    status,
    entity_type,
    entity_id,
    entity_name,
    previous_state,
    new_state,
    changed_fields,
    error_code,
    error_message,
    device_info,
    browser_info,
    is_lgpd_sensitive,
    is_critical,
    is_reversible,
    duration_ms,
    user_role,
    environment
  ) VALUES (
    auth.uid(),
    p_action,
    p_module,
    p_details,
    p_ip_address,
    p_action_type,
    p_origin,
    p_impact_level,
    p_status,
    p_entity_type,
    p_entity_id,
    p_entity_name,
    p_previous_state,
    p_new_state,
    p_changed_fields,
    p_error_code,
    p_error_message,
    p_device_info,
    p_browser_info,
    p_is_lgpd_sensitive,
    p_is_critical,
    p_is_reversible,
    p_duration_ms,
    v_user_role,
    'production'
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Update the get_app_logs_admin function to return new fields
CREATE OR REPLACE FUNCTION public.get_app_logs_admin(
  p_module TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_action_type TEXT DEFAULT NULL,
  p_origin TEXT DEFAULT NULL,
  p_impact_level TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_is_critical BOOLEAN DEFAULT NULL,
  p_entity_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  action TEXT,
  module TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_email TEXT,
  action_type TEXT,
  origin TEXT,
  impact_level TEXT,
  status TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  previous_state JSONB,
  new_state JSONB,
  changed_fields TEXT[],
  error_code TEXT,
  error_message TEXT,
  device_info TEXT,
  browser_info TEXT,
  is_lgpd_sensitive BOOLEAN,
  is_critical BOOLEAN,
  is_reversible BOOLEAN,
  duration_ms INTEGER,
  user_role TEXT,
  user_profile TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.action,
    al.module,
    al.details,
    al.ip_address,
    al.created_at,
    COALESCE(u.email, 'Sistema') as user_email,
    al.action_type::TEXT,
    al.origin::TEXT,
    al.impact_level::TEXT,
    al.status::TEXT,
    al.entity_type,
    al.entity_id,
    al.entity_name,
    al.previous_state,
    al.new_state,
    al.changed_fields,
    al.error_code,
    al.error_message,
    al.device_info,
    al.browser_info,
    al.is_lgpd_sensitive,
    al.is_critical,
    al.is_reversible,
    al.duration_ms,
    al.user_role,
    al.user_profile
  FROM public.app_logs al
  LEFT JOIN public.usuarios u ON u.id = al.user_id
  WHERE
    (p_module IS NULL OR al.module = p_module)
    AND (p_action IS NULL OR al.action = p_action)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_action_type IS NULL OR al.action_type::TEXT = p_action_type)
    AND (p_origin IS NULL OR al.origin::TEXT = p_origin)
    AND (p_impact_level IS NULL OR al.impact_level::TEXT = p_impact_level)
    AND (p_status IS NULL OR al.status::TEXT = p_status)
    AND (p_is_critical IS NULL OR al.is_critical = p_is_critical)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
  ORDER BY al.created_at DESC
  LIMIT 2000;
END;
$$;