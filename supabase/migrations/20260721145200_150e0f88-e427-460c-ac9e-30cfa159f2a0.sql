
CREATE TABLE IF NOT EXISTS public.kickoff_bypass_allowed_users (
  email text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kickoff_bypass_allowed_users TO authenticated;
GRANT ALL ON public.kickoff_bypass_allowed_users TO service_role;

ALTER TABLE public.kickoff_bypass_allowed_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_bypass_allowed_users" ON public.kickoff_bypass_allowed_users;
CREATE POLICY "admin_manage_bypass_allowed_users"
  ON public.kickoff_bypass_allowed_users
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to check if their own email is on the list (needed for the UI to
-- decide whether to show the "Pular para Agendamento" button).
DROP POLICY IF EXISTS "self_check_bypass_allowed_users" ON public.kickoff_bypass_allowed_users;
CREATE POLICY "self_check_bypass_allowed_users"
  ON public.kickoff_bypass_allowed_users
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

INSERT INTO public.kickoff_bypass_allowed_users (email) VALUES
  ('bruno.litivack@segsat.com'),
  ('heder.chaves@segsat.com'),
  ('carlos.gustavo@segsat.com')
ON CONFLICT (email) DO NOTHING;

-- Replace RLS on kickoff_bypass_log so SELECT is admin-only and INSERT is admin-or-allowed.
DROP POLICY IF EXISTS kickoff_bypass_log_select_with_view_access ON public.kickoff_bypass_log;
DROP POLICY IF EXISTS kickoff_bypass_log_insert_self_with_edit_access ON public.kickoff_bypass_log;

CREATE POLICY "kickoff_bypass_log_select_admin_only"
  ON public.kickoff_bypass_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "kickoff_bypass_log_insert_admin_or_allowed"
  ON public.kickoff_bypass_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    performed_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.kickoff_bypass_allowed_users a
        WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    )
  );
