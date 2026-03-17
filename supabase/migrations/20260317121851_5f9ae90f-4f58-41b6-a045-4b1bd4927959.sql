
-- Table for registered API endpoints
CREATE TABLE public.api_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  method text NOT NULL DEFAULT 'GET',
  system_origin text NOT NULL DEFAULT 'Interno',
  headers jsonb DEFAULT '{}',
  default_body jsonb DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  expected_response_time_ms integer DEFAULT 5000,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage api_endpoints"
  ON public.api_endpoints FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Table for execution logs
CREATE TABLE public.api_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES public.api_endpoints(id) ON DELETE CASCADE NOT NULL,
  status_code integer,
  response_time_ms integer,
  request_headers jsonb DEFAULT '{}',
  request_body jsonb DEFAULT NULL,
  response_body text DEFAULT NULL,
  error_message text DEFAULT NULL,
  executed_by uuid REFERENCES auth.users(id),
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.api_execution_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage api_execution_logs"
  ON public.api_execution_logs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Index for faster log queries
CREATE INDEX idx_api_execution_logs_endpoint_id ON public.api_execution_logs(endpoint_id);
CREATE INDEX idx_api_execution_logs_executed_at ON public.api_execution_logs(executed_at DESC);
