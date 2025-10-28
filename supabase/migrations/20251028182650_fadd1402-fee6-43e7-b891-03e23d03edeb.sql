-- Allow deletion on kit_item_options for creators and admins
-- Drop existing policies if they exist to avoid duplicates
DROP POLICY IF EXISTS "Users can delete their own kit item options" ON public.kit_item_options;
CREATE POLICY "Users can delete their own kit item options"
ON public.kit_item_options
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can delete any kit item option" ON public.kit_item_options;
CREATE POLICY "Admins can delete any kit item option"
ON public.kit_item_options
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));