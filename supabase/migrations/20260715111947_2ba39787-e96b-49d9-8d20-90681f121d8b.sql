ALTER TABLE public.installation_schedules
  ADD COLUMN IF NOT EXISTS tipo_contrato text,
  ADD COLUMN IF NOT EXISTS vehicle_year text;