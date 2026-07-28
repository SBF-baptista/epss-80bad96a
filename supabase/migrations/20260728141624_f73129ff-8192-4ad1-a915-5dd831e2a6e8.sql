CREATE TABLE public.unit_activation_allowed_users (
  email text PRIMARY KEY,
  added_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.unit_activation_allowed_users TO authenticated;
GRANT ALL ON public.unit_activation_allowed_users TO service_role;

ALTER TABLE public.unit_activation_allowed_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view allowed users"
ON public.unit_activation_allowed_users
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage allowed users"
ON public.unit_activation_allowed_users
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.unit_activation_allowed_users (email) VALUES
  ('matheus.nunes@segsat.com'),
  ('sostenes.silva@segsat.com')
ON CONFLICT (email) DO NOTHING;