CREATE OR REPLACE FUNCTION public.trg_force_plus2gps_segsale()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.usage_type::text = 'particular' AND NEW.sale_summary_id IS NOT NULL THEN
    NEW.usage_type := 'plus_2_gps';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS force_plus2gps_segsale ON public.incoming_vehicles;
CREATE TRIGGER force_plus2gps_segsale BEFORE INSERT OR UPDATE OF usage_type ON public.incoming_vehicles
FOR EACH ROW EXECUTE FUNCTION public.trg_force_plus2gps_segsale();