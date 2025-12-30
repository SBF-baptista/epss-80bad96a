-- Create table for accessory/supply edit requests
CREATE TABLE public.item_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL, -- 'accessory' or 'supply'
  item_name text NOT NULL,
  original_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  requested_by uuid REFERENCES auth.users(id),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  review_notes text,
  kit_id uuid REFERENCES public.homologation_kits(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_edit_requests ENABLE ROW LEVEL SECURITY;

-- Policies for viewing edit requests
CREATE POLICY "Authenticated users can view edit requests"
ON public.item_edit_requests
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy for creating edit requests (any authenticated user)
CREATE POLICY "Authenticated users can create edit requests"
ON public.item_edit_requests
FOR INSERT
WITH CHECK (auth.uid() = requested_by);

-- Policy for updating edit requests (only gestor and admin can approve/reject)
CREATE POLICY "Gestor and admin can update edit requests"
ON public.item_edit_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_item_edit_requests_updated_at
BEFORE UPDATE ON public.item_edit_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();