-- Add tracking code field to kit_schedules table
ALTER TABLE public.kit_schedules 
ADD COLUMN IF NOT EXISTS tracking_code text;