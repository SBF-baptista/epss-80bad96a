-- Add column to store TomTicket protocol number
ALTER TABLE public.incoming_vehicles
ADD COLUMN tomticket_protocol TEXT;