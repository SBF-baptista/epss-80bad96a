-- Permite que administradores do módulo Homologação tenham acesso total
-- às tabelas usadas pela página/fluxo de Homologação, mesmo sem role global admin.

-- ============================================================
-- homologation_cards
-- ============================================================
DROP POLICY IF EXISTS "Module users can view homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Module users can create homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Module users can update homologation cards" ON public.homologation_cards;
DROP POLICY IF EXISTS "Module admins can delete homologation cards" ON public.homologation_cards;

CREATE POLICY "Module users can view homologation cards"
ON public.homologation_cards
FOR SELECT
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level)
  OR public.has_module_access(auth.uid(), 'kickoff'::app_module, 'view'::permission_level)
);

CREATE POLICY "Module users can create homologation cards"
ON public.homologation_cards
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Module users can update homologation cards"
ON public.homologation_cards
FOR UPDATE
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
)
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Module admins can delete homologation cards"
ON public.homologation_cards
FOR DELETE
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'admin'::permission_level)
);

-- ============================================================
-- automation_rules_extended / Gestão de Configurações
-- ============================================================
DROP POLICY IF EXISTS "Module users can view automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Module users can create automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Module users can update automation rules" ON public.automation_rules_extended;
DROP POLICY IF EXISTS "Module users can delete automation rules" ON public.automation_rules_extended;

CREATE POLICY "Module users can view automation rules"
ON public.automation_rules_extended
FOR SELECT
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level)
);

CREATE POLICY "Module users can create automation rules"
ON public.automation_rules_extended
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Module users can update automation rules"
ON public.automation_rules_extended
FOR UPDATE
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
)
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Module users can delete automation rules"
ON public.automation_rules_extended
FOR DELETE
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
);

-- ============================================================
-- kit_item_options / Acessórios, Insumos, Equipamentos e Módulos
-- ============================================================
DROP POLICY IF EXISTS "Module users can view kit item options" ON public.kit_item_options;
DROP POLICY IF EXISTS "Module admins can manage kit item options" ON public.kit_item_options;

ALTER TABLE public.kit_item_options
  DROP CONSTRAINT IF EXISTS kit_item_options_item_type_check;

ALTER TABLE public.kit_item_options
  ADD CONSTRAINT kit_item_options_item_type_check
  CHECK (item_type = ANY (ARRAY['equipment'::text, 'accessory'::text, 'supply'::text, 'module'::text]));

CREATE POLICY "Module users can view kit item options"
ON public.kit_item_options
FOR SELECT
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'view'::permission_level)
  OR public.has_module_access(auth.uid(), 'accessories_supplies'::app_module, 'view'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'view'::permission_level)
);

CREATE POLICY "Module admins can manage kit item options"
ON public.kit_item_options
FOR ALL
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'admin'::permission_level)
  OR public.has_module_access(auth.uid(), 'accessories_supplies'::app_module, 'admin'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'admin'::permission_level)
)
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'admin'::permission_level)
  OR public.has_module_access(auth.uid(), 'accessories_supplies'::app_module, 'admin'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'admin'::permission_level)
);

-- ============================================================
-- Kits de homologação e itens do kit
-- ============================================================
DROP POLICY IF EXISTS "Module users can manage homologation kits" ON public.homologation_kits;
DROP POLICY IF EXISTS "Module users can manage homologation kit items" ON public.homologation_kit_accessories;

CREATE POLICY "Module users can manage homologation kits"
ON public.homologation_kits
FOR ALL
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'edit'::permission_level)
)
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'edit'::permission_level)
);

CREATE POLICY "Module users can manage homologation kit items"
ON public.homologation_kit_accessories
FOR ALL
TO authenticated
USING (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'edit'::permission_level)
)
WITH CHECK (
  public.has_module_access(auth.uid(), 'homologation'::app_module, 'edit'::permission_level)
  OR public.has_module_access(auth.uid(), 'kits'::app_module, 'edit'::permission_level)
);