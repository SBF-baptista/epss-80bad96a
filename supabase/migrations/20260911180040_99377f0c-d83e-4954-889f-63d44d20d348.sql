REVOKE ALL ON FUNCTION public.apply_accessory_homologation_exemption(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.apply_accessory_homologation_exemption(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_accessory_homologation_exemption(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.trg_apply_accessory_homologation_exemption() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_apply_accessory_homologation_exemption() FROM anon;
REVOKE ALL ON FUNCTION public.trg_apply_accessory_homologation_exemption() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trg_apply_accessory_homologation_exemption() TO service_role;