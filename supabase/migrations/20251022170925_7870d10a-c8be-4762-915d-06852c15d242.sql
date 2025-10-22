-- Create table for kit schedule status history
CREATE TABLE IF NOT EXISTS public.kit_schedule_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_schedule_id UUID NOT NULL REFERENCES public.kit_schedules(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_kit_schedule_status_history_kit_schedule_id 
ON public.kit_schedule_status_history(kit_schedule_id);

CREATE INDEX IF NOT EXISTS idx_kit_schedule_status_history_changed_at 
ON public.kit_schedule_status_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.kit_schedule_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view status history"
ON public.kit_schedule_status_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "System can create status history"
ON public.kit_schedule_status_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create trigger function to automatically log status changes
CREATE OR REPLACE FUNCTION public.log_kit_schedule_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR TG_OP = 'INSERT' THEN
    INSERT INTO public.kit_schedule_status_history (
      kit_schedule_id,
      previous_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on kit_schedules
DROP TRIGGER IF EXISTS trigger_log_kit_schedule_status_change ON public.kit_schedules;
CREATE TRIGGER trigger_log_kit_schedule_status_change
AFTER INSERT OR UPDATE OF status ON public.kit_schedules
FOR EACH ROW
EXECUTE FUNCTION public.log_kit_schedule_status_change();