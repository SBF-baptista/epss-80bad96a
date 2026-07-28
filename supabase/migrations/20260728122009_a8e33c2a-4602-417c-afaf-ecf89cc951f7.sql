ALTER TABLE public.frota_unit_activation_audit ALTER COLUMN sistema DROP DEFAULT;
ALTER TABLE public.frota_unit_activation_audit ALTER COLUMN sistema DROP NOT NULL;