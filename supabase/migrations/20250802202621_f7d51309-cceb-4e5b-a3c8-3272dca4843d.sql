-- Add soft delete column to homologation_cards
ALTER TABLE public.homologation_cards 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better performance when filtering out deleted records
CREATE INDEX idx_homologation_cards_deleted_at ON public.homologation_cards(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policy to allow admins to soft delete (update deleted_at)
CREATE POLICY "Admins can soft delete homologation cards"
ON public.homologation_cards
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));