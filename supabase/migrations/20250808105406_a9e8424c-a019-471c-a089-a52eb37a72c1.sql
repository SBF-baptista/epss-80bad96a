-- Add phone field to shipment_recipients table
ALTER TABLE public.shipment_recipients 
ADD COLUMN phone text;