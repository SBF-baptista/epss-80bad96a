-- Add configuration and selected_kit_ids fields to kit_schedules table
ALTER TABLE kit_schedules 
ADD COLUMN IF NOT EXISTS configuration text,
ADD COLUMN IF NOT EXISTS selected_kit_ids text[];

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_kit_schedules_selected_kit_ids ON kit_schedules USING GIN(selected_kit_ids);