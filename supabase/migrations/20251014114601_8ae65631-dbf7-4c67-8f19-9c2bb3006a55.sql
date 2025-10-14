-- Add kickoff_completed column to incoming_vehicles table
ALTER TABLE incoming_vehicles
ADD COLUMN IF NOT EXISTS kickoff_completed BOOLEAN DEFAULT false;

-- Create index for better performance on kickoff queries
CREATE INDEX IF NOT EXISTS idx_incoming_vehicles_sale_summary_kickoff 
ON incoming_vehicles(sale_summary_id, kickoff_completed) 
WHERE sale_summary_id IS NOT NULL;

COMMENT ON COLUMN incoming_vehicles.kickoff_completed IS 'Indicates if the kickoff process has been completed for this vehicle';