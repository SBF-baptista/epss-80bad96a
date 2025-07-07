-- Add new usage types to the vehicle_usage_type enum
ALTER TYPE vehicle_usage_type ADD VALUE 'telemetria_gps';
ALTER TYPE vehicle_usage_type ADD VALUE 'telemetria_can';
ALTER TYPE vehicle_usage_type ADD VALUE 'copiloto_2_cameras';
ALTER TYPE vehicle_usage_type ADD VALUE 'copiloto_4_cameras';