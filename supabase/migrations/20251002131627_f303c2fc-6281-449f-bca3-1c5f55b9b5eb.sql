-- Add accessories and supplies columns to kit_schedules table
ALTER TABLE kit_schedules 
ADD COLUMN IF NOT EXISTS accessories text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS supplies text[] DEFAULT '{}';