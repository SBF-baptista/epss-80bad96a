
-- Table to track real user last access (not just auth sign-in)
CREATE TABLE public.user_last_seen (
  user_id UUID NOT NULL PRIMARY KEY,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_last_seen ENABLE ROW LEVEL SECURITY;

-- Users can view all last_seen records (needed for admin listing)
CREATE POLICY "Admins can view all last_seen"
  ON public.user_last_seen
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can upsert their own last_seen
CREATE POLICY "Users can upsert their own last_seen"
  ON public.user_last_seen
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own last_seen"
  ON public.user_last_seen
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can read all (for edge functions)
CREATE POLICY "Service role can read all last_seen"
  ON public.user_last_seen
  FOR SELECT
  USING (auth.role() = 'service_role');
