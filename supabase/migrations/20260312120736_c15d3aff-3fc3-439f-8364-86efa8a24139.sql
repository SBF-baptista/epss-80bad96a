
CREATE TABLE public.installation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plate text NOT NULL,
  imei text NOT NULL,
  source text DEFAULT 'instala',
  raw_payload jsonb,
  matched_schedule_id uuid REFERENCES public.kit_schedules(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.installation_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view confirmations"
  ON public.installation_confirmations FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert confirmations"
  ON public.installation_confirmations FOR INSERT TO public
  WITH CHECK (true);
