-- Cache table for Ruptela vehicle list
CREATE TABLE public.ruptela_vehicles_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ruptela_cache_key ON public.ruptela_vehicles_cache(cache_key);
CREATE INDEX idx_ruptela_cache_fetched_at ON public.ruptela_vehicles_cache(fetched_at);

ALTER TABLE public.ruptela_vehicles_cache ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cache (Edge Function will also use service role)
CREATE POLICY "Authenticated users can read ruptela cache"
ON public.ruptela_vehicles_cache
FOR SELECT
TO authenticated
USING (true);

-- Only service role can write (Edge Functions); no policies for INSERT/UPDATE/DELETE
-- means RLS blocks all client writes by default.

CREATE TRIGGER update_ruptela_vehicles_cache_updated_at
BEFORE UPDATE ON public.ruptela_vehicles_cache
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();