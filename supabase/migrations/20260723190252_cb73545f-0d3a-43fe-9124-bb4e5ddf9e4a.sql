ALTER TABLE public.frota_unit_activation_audit
  ADD COLUMN IF NOT EXISTS sistema text NOT NULL DEFAULT 'frota'
    CHECK (sistema IN ('frota','auto')),
  ADD COLUMN IF NOT EXISTS wialon_item_id bigint,
  ADD COLUMN IF NOT EXISTS wialon_item_name text,
  ADD COLUMN IF NOT EXISTS placa text;

ALTER TABLE public.frota_unit_activation_audit
  ALTER COLUMN filial_contrato DROP NOT NULL,
  ALTER COLUMN tipo_contrato DROP NOT NULL;