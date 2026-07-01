CREATE OR REPLACE FUNCTION public.delete_pending_kickoff_card_admin(p_sale_summary_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vehicle_ids uuid[];
  v_vehicle_count integer := 0;
  v_accessory_count integer := 0;
  v_company_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_module_access(auth.uid(), 'kickoff'::public.app_module, 'admin'::public.permission_level)
  ) THEN
    RAISE EXCEPTION 'Permissão insuficiente para excluir cards do Kickoff';
  END IF;

  SELECT array_agg(id), count(*), max(company_name)
    INTO v_vehicle_ids, v_vehicle_count, v_company_name
  FROM public.incoming_vehicles
  WHERE sale_summary_id = p_sale_summary_id
    AND kickoff_completed = false;

  IF v_vehicle_count = 0 OR v_vehicle_ids IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Nenhum card pendente encontrado para esta venda.',
      'sale_summary_id', p_sale_summary_id,
      'deleted_vehicles', 0,
      'deleted_accessories', 0
    );
  END IF;

  DELETE FROM public.accessories
  WHERE vehicle_id = ANY(v_vehicle_ids);
  GET DIAGNOSTICS v_accessory_count = ROW_COUNT;

  DELETE FROM public.incoming_vehicles
  WHERE id = ANY(v_vehicle_ids)
    AND kickoff_completed = false;
  GET DIAGNOSTICS v_vehicle_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Card pendente do Kickoff excluído com sucesso.',
    'sale_summary_id', p_sale_summary_id,
    'company_name', v_company_name,
    'deleted_vehicles', v_vehicle_count,
    'deleted_accessories', v_accessory_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_pending_kickoff_card_admin(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_pending_kickoff_card_admin(integer) TO service_role;