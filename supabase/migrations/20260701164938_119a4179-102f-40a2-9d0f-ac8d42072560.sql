GRANT SELECT, INSERT, UPDATE, DELETE ON public.homologation_cards TO authenticated;
GRANT ALL ON public.homologation_cards TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homologation_files TO authenticated;
GRANT ALL ON public.homologation_files TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homologation_photos TO authenticated;
GRANT ALL ON public.homologation_photos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homologation_kits TO authenticated;
GRANT ALL ON public.homologation_kits TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.homologation_kit_accessories TO authenticated;
GRANT ALL ON public.homologation_kit_accessories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules_extended TO authenticated;
GRANT ALL ON public.automation_rules_extended TO service_role;