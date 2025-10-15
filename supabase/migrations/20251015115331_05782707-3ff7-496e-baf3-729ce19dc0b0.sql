-- Create kickoff_history table to store approved kickoffs
CREATE TABLE IF NOT EXISTS public.kickoff_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_summary_id integer NOT NULL,
  company_name text NOT NULL,
  total_vehicles integer NOT NULL DEFAULT 0,
  contacts jsonb DEFAULT '[]'::jsonb,
  installation_locations jsonb DEFAULT '[]'::jsonb,
  has_installation_particularity boolean DEFAULT false,
  installation_particularity_details text,
  kickoff_notes text,
  vehicles_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kickoff_history ENABLE ROW LEVEL SECURITY;

-- Create policies for kickoff_history
CREATE POLICY "Only admins and order managers can view kickoff history"
  ON public.kickoff_history
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'order_manager'::app_role)
  );

CREATE POLICY "Only admins and order managers can create kickoff history"
  ON public.kickoff_history
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'order_manager'::app_role)
  );

CREATE POLICY "System can create kickoff history (triggers)"
  ON public.kickoff_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NULL OR 
    auth.role() = 'service_role'
  );

-- Add index for faster lookups
CREATE INDEX idx_kickoff_history_sale_summary_id ON public.kickoff_history(sale_summary_id);
CREATE INDEX idx_kickoff_history_approved_at ON public.kickoff_history(approved_at DESC);