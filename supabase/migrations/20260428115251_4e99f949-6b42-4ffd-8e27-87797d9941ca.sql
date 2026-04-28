
CREATE TABLE public.simulator_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  supported_count INTEGER NOT NULL DEFAULT 0,
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_simulator_simulations_user ON public.simulator_simulations(user_id, created_at DESC);

ALTER TABLE public.simulator_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own simulations"
  ON public.simulator_simulations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own simulations"
  ON public.simulator_simulations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own simulations"
  ON public.simulator_simulations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own simulations"
  ON public.simulator_simulations FOR DELETE
  USING (auth.uid() = user_id);
