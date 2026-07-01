CREATE OR REPLACE FUNCTION public.delete_homologation_kit_admin(p_kit_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_module_access(auth.uid(), 'homologation'::app_module, 'admin'::permission_level) THEN
    RAISE EXCEPTION 'Sem permissão para excluir kit de homologação';
  END IF;

  UPDATE public.kit_schedules
  SET kit_id = NULL
  WHERE kit_id = p_kit_id;

  DELETE FROM public.homologation_kit_accessories
  WHERE kit_id = p_kit_id;

  DELETE FROM public.homologation_kits
  WHERE id = p_kit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_homologation_kit_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_homologation_kit_admin(uuid) TO service_role;