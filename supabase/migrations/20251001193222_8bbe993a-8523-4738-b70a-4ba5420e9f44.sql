-- Add columns to store accessories and supplies for each kit schedule
ALTER TABLE kit_schedules 
ADD COLUMN IF NOT EXISTS accessories JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS supplies JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN kit_schedules.accessories IS 'Array of accessories for this specific installation schedule';
COMMENT ON COLUMN kit_schedules.supplies IS 'Array of supplies/modules for this specific installation schedule';