-- Create table to track item homologation status changes
CREATE TABLE IF NOT EXISTS public.item_homologation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('homologated', 'pending')),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_item_homologation_history_item ON public.item_homologation_history(item_name, item_type);
CREATE INDEX IF NOT EXISTS idx_item_homologation_history_status ON public.item_homologation_history(status);
CREATE INDEX IF NOT EXISTS idx_item_homologation_history_changed_at ON public.item_homologation_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.item_homologation_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view history
CREATE POLICY "Authenticated users can view item homologation history"
  ON public.item_homologation_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow system to insert history records
CREATE POLICY "System can insert item homologation history"
  ON public.item_homologation_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to log homologation status change
CREATE OR REPLACE FUNCTION public.log_item_homologation_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Item was homologated
    INSERT INTO public.item_homologation_history (item_name, item_type, status, changed_by)
    VALUES (NEW.item_name, NEW.item_type, 'homologated', NEW.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    -- Item was removed from homologation (became pending)
    INSERT INTO public.item_homologation_history (item_name, item_type, status, changed_by)
    VALUES (OLD.item_name, OLD.item_type, 'pending', auth.uid());
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on kit_item_options to track homologation changes
CREATE TRIGGER trigger_log_item_homologation_change
AFTER INSERT OR DELETE ON public.kit_item_options
FOR EACH ROW
EXECUTE FUNCTION public.log_item_homologation_change();

COMMENT ON TABLE public.item_homologation_history IS 'Tracks when items change homologation status to calculate pending days correctly';
COMMENT ON FUNCTION public.log_item_homologation_change() IS 'Automatically logs when items are homologated or become pending';