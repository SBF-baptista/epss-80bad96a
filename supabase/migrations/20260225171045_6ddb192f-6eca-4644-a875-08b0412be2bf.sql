
-- Add columns for camera extra sale and accessories sale data
ALTER TABLE public.kickoff_history
ADD COLUMN camera_extra_sale jsonb DEFAULT NULL,
ADD COLUMN accessories_sale jsonb DEFAULT NULL;
