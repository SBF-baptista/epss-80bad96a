-- Ensure triggers exist and are correct, add helpful indexes, and backfill Planning visibility
begin;

-- 1) Triggers on homologation_cards
-- Create/replace trigger to populate Planning when status becomes 'homologado'
drop trigger if exists trg_hc_status_planning on public.homologation_cards;
create trigger trg_hc_status_planning
  after insert or update of status on public.homologation_cards
  for each row
  execute function public.create_kit_schedule_from_homologation();

-- Create/replace trigger to clean Planning and schedules when leaving 'homologado'
drop trigger if exists trg_hc_status_change_cleanup on public.homologation_cards;
create trigger trg_hc_status_change_cleanup
  after update of status on public.homologation_cards
  for each row
  execute function public.handle_homologation_status_change();

-- 2) Trigger on incoming_vehicles for auto Planning creation for Segsale vehicles
drop trigger if exists trg_incoming_auto_planning on public.incoming_vehicles;
create trigger trg_incoming_auto_planning
  after insert on public.incoming_vehicles
  for each row
  execute function public.auto_create_planning_customer_from_incoming();

-- 3) Helpful indexes to speed up lookups used in the functions
create index if not exists idx_customers_id_resumo_venda on public.customers (id_resumo_venda);
create index if not exists idx_customers_document_number on public.customers (document_number);
create index if not exists idx_iv_brand_vehicle on public.incoming_vehicles ((upper(trim(brand))), (upper(trim(vehicle))));
create index if not exists idx_hc_brand_model_status on public.homologation_cards ((upper(trim(brand))), (upper(trim(model))), status);

-- 4) Backfill: ensure customers tied to homologated models are visible in Planning
update public.customers c
set show_in_planning = true
from public.incoming_vehicles iv
join public.homologation_cards hc
  on hc.status = 'homologado'
 and upper(trim(hc.brand)) = upper(trim(iv.brand))
 and (
   upper(trim(hc.model)) = upper(trim(iv.vehicle))
   or upper(trim(hc.model)) like '%' || upper(trim(split_part(iv.vehicle, ' ', 1))) || '%'
   or upper(trim(iv.vehicle)) like '%' || upper(trim(split_part(hc.model, ' ', 1))) || '%'
 )
where c.id_resumo_venda = iv.id_resumo_venda
  and c.show_in_planning = false;

-- 5) Optional: relink previous homologations to Segsale incoming records and mark customers for Planning
DO $$
BEGIN
  PERFORM public.relink_homologations_to_segsale_incoming();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'relink_homologations_to_segsale_incoming failed: %', SQLERRM;
END $$;

commit;