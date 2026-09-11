ALTER TABLE public.kit_item_options
ADD COLUMN requires_homologation boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.kit_item_options.requires_homologation IS
'Indica se veículos vinculados a este item devem passar pelo processo completo de homologação.';