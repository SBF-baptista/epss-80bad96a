-- Update RLS to allow order_manager to create homologation cards
DROP POLICY IF EXISTS "Authenticated users can create homologation cards" ON public.homologation_cards;

CREATE POLICY "Authenticated users can create homologation cards"
ON public.homologation_cards
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'installer')
  OR has_role(auth.uid(), 'order_manager')
);
