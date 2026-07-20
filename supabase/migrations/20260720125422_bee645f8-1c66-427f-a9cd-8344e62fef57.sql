CREATE TYPE public.frota_unit_status_type AS ENUM ('pending', 'created', 'failed');

ALTER TABLE public.kit_schedules
  ADD COLUMN frota_unit_status public.frota_unit_status_type NOT NULL DEFAULT 'pending',
  ADD COLUMN frota_unit_error text,
  ADD COLUMN frota_unit_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN frota_unit_created_at timestamptz,
  ADD COLUMN frota_unit_last_attempt_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_kit_schedules_frota_unit_status
  ON public.kit_schedules(frota_unit_status)
  WHERE frota_unit_status IN ('pending', 'failed');