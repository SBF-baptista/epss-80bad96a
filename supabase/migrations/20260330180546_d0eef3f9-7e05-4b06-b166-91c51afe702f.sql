-- Drop the old unique index that doesn't account for plate
DROP INDEX IF EXISTS idx_incoming_vehicles_unique_segsale;

-- Create new unique index that includes plate for proper fleet deduplication
CREATE UNIQUE INDEX idx_incoming_vehicles_unique_segsale 
ON public.incoming_vehicles (brand, vehicle, COALESCE(year, 0), COALESCE(plate, ''), sale_summary_id) 
WHERE (sale_summary_id IS NOT NULL);