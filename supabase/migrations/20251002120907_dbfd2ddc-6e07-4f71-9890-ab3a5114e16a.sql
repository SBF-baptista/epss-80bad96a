-- Add 'shipped' as a valid status for kit_schedules
-- Add a CHECK constraint to ensure only valid statuses are used
ALTER TABLE kit_schedules 
DROP CONSTRAINT IF EXISTS kit_schedules_status_check;

ALTER TABLE kit_schedules 
ADD CONSTRAINT kit_schedules_status_check 
CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'shipped'));

-- Add comment to document the valid status values
COMMENT ON COLUMN kit_schedules.status IS 'Valid values: scheduled, in_progress, completed, cancelled, shipped';