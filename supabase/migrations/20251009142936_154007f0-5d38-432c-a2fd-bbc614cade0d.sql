-- Triggers to synchronize Planning with homologation status changes
DROP TRIGGER IF EXISTS trg_hc_status_planning ON public.homologation_cards;
CREATE TRIGGER trg_hc_status_planning
  AFTER INSERT OR UPDATE OF status ON public.homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.create_kit_schedule_from_homologation();

DROP TRIGGER IF EXISTS trg_hc_status_change_cleanup ON public.homologation_cards;
CREATE TRIGGER trg_hc_status_change_cleanup
  AFTER UPDATE ON public.homologation_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_homologation_status_change();

-- Enable realtime for customers so Planning updates instantly
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;