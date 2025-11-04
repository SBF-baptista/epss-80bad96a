-- Create table for system activity logs
CREATE TABLE IF NOT EXISTS public.app_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  module text NOT NULL,
  details text,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_app_logs_user_id ON public.app_logs(user_id);
CREATE INDEX idx_app_logs_created_at ON public.app_logs(created_at DESC);
CREATE INDEX idx_app_logs_module ON public.app_logs(module);
CREATE INDEX idx_app_logs_action ON public.app_logs(action);

-- Enable Row Level Security
ALTER TABLE public.app_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view logs
CREATE POLICY "Only admins can view logs"
  ON public.app_logs
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: System can insert logs
CREATE POLICY "System can insert logs"
  ON public.app_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Admins can delete old logs
CREATE POLICY "Admins can delete logs"
  ON public.app_logs
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to log actions
CREATE OR REPLACE FUNCTION public.log_action(
  p_action text,
  p_module text,
  p_details text DEFAULT NULL,
  p_ip_address text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_logs (user_id, action, module, details, ip_address)
  VALUES (auth.uid(), p_action, p_module, p_details, p_ip_address);
END;
$$;