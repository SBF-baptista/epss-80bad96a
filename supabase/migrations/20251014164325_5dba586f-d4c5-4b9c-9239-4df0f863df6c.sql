-- Enable Realtime for incoming_vehicles table
ALTER TABLE public.incoming_vehicles REPLICA IDENTITY FULL;

-- Enable Realtime for accessories table
ALTER TABLE public.accessories REPLICA IDENTITY FULL;

-- Add both tables to the Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_vehicles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accessories;