ALTER TABLE public.kit_schedules
  ADD COLUMN IF NOT EXISTS counting_notes text,
  ADD COLUMN IF NOT EXISTS counting_completed_by uuid,
  ADD COLUMN IF NOT EXISTS counting_completed_by_email text,
  ADD COLUMN IF NOT EXISTS counting_completed_at timestamptz;