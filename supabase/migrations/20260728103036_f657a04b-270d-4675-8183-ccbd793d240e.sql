ALTER TABLE public.frota_unit_activation_audit
  DROP CONSTRAINT IF EXISTS frota_unit_activation_audit_action_check;

ALTER TABLE public.frota_unit_activation_audit
  ADD CONSTRAINT frota_unit_activation_audit_action_check
  CHECK (action = ANY (ARRAY['activate','deactivate','create','create_partial_failure','delete','delete_failed']));

ALTER TABLE public.frota_units_pending_imei
  ADD COLUMN IF NOT EXISTS wialon_item_id bigint,
  ADD COLUMN IF NOT EXISTS sistema text,
  ADD COLUMN IF NOT EXISTS hardware text,
  ADD COLUMN IF NOT EXISTS wialon_resource_id bigint;