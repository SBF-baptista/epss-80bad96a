-- Create table to store installation search history
CREATE TABLE public.installation_search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  searched_plate text NOT NULL,
  searched_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  found boolean NOT NULL DEFAULT false,
  result_type text, -- 'confirmation', 'schedule', 'not_found'
  result_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.installation_search_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage search history
CREATE POLICY "Admins can manage search history"
  ON public.installation_search_history
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can insert (for logging searches)
CREATE POLICY "Authenticated users can insert search history"
  ON public.installation_search_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);