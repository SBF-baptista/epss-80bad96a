
CREATE TABLE public.access_profile_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.access_profiles(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  name_before TEXT,
  name_after TEXT,
  description_before TEXT,
  description_after TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_profile_history_profile ON public.access_profile_history(profile_id, created_at DESC);

GRANT SELECT, INSERT ON public.access_profile_history TO authenticated;
GRANT ALL ON public.access_profile_history TO service_role;

ALTER TABLE public.access_profile_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access profile history"
  ON public.access_profile_history FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can insert access profile history"
  ON public.access_profile_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);
