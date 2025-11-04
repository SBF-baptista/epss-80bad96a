-- Criar função RPC para registrar logs
CREATE OR REPLACE FUNCTION public.log_action(
  p_action text,
  p_module text,
  p_details text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.app_logs (user_id, action, module, details, ip_address)
  VALUES (auth.uid(), p_action, p_module, p_details, p_ip_address);
END;
$$;