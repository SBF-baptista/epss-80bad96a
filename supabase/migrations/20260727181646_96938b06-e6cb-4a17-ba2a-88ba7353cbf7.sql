ALTER TABLE public.frota_unit_activation_audit
  DROP CONSTRAINT frota_unit_activation_audit_action_check;

ALTER TABLE public.frota_unit_activation_audit
  ADD CONSTRAINT frota_unit_activation_audit_action_check
  CHECK (action = ANY (ARRAY['activate'::text, 'deactivate'::text, 'create'::text, 'create_partial_failure'::text]));

ALTER TABLE public.frota_unit_activation_audit
  ADD COLUMN IF NOT EXISTS imei text;