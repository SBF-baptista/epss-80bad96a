-- Add kit_schedule_id column to installation_schedules
ALTER TABLE installation_schedules
ADD COLUMN kit_schedule_id uuid REFERENCES kit_schedules(id) ON DELETE SET NULL;