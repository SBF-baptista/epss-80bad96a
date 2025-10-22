-- Restore RLS policies that were removed by DROP TYPE CASCADE

-- ============================================================
-- homologation_cards policies
-- ============================================================
CREATE POLICY "Authenticated users can view homologation cards"
ON public.homologation_cards FOR SELECT
TO authenticated
USING (deleted_at IS NULL);

CREATE POLICY "Authenticated users can create homologation cards"
ON public.homologation_cards FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update homologation cards"
ON public.homologation_cards FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete homologation cards"
ON public.homologation_cards FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- homologation_photos policies
-- ============================================================
CREATE POLICY "Authenticated users can view homologation photos"
ON public.homologation_photos FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- customers policies
-- ============================================================
CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create customers"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================
-- kit_schedules policies
-- ============================================================
CREATE POLICY "Authenticated users can view kit schedules"
ON public.kit_schedules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can update kit schedules"
ON public.kit_schedules FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete kit schedules"
ON public.kit_schedules FOR DELETE
TO authenticated
USING (true);

-- ============================================================
-- pedidos policies
-- ============================================================
CREATE POLICY "Users can view their orders and automatic orders"
ON public.pedidos FOR SELECT
TO authenticated
USING (
  auth.uid() = usuario_id 
  OR usuario_id IS NULL 
  OR numero_pedido LIKE 'AUTO-%'
);

-- ============================================================
-- production_items policies
-- ============================================================
CREATE POLICY "Authenticated users can view production items"
ON public.production_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create production items"
ON public.production_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update production items"
ON public.production_items FOR UPDATE
TO authenticated
USING (true);

-- ============================================================
-- shipment_recipients policies
-- ============================================================
CREATE POLICY "Authenticated users can view shipment recipients"
ON public.shipment_recipients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create shipment recipients"
ON public.shipment_recipients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update shipment recipients"
ON public.shipment_recipients FOR UPDATE
TO authenticated
USING (true);

-- ============================================================
-- kit_item_options policies
-- ============================================================
CREATE POLICY "Authenticated users can view kit item options"
ON public.kit_item_options FOR SELECT
TO authenticated
USING (true);

-- ============================================================
-- kickoff_history policies
-- ============================================================
CREATE POLICY "Authenticated users can view kickoff history"
ON public.kickoff_history FOR SELECT
TO authenticated
USING (true);