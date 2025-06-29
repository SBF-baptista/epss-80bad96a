
-- Add year field to homologation_cards table
ALTER TABLE public.homologation_cards 
ADD COLUMN year INTEGER;

-- Create table for homologation photos
CREATE TABLE public.homologation_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homologation_card_id UUID NOT NULL REFERENCES public.homologation_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security for photos
ALTER TABLE public.homologation_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for homologation photos
CREATE POLICY "Users can view all homologation photos" 
  ON public.homologation_photos 
  FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create homologation photos" 
  ON public.homologation_photos 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update homologation photos" 
  ON public.homologation_photos 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete homologation photos" 
  ON public.homologation_photos 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- Create storage bucket for homologation photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('homologation-photos', 'homologation-photos', true);

-- Create storage policies for homologation photos
CREATE POLICY "Public read access for homologation photos" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'homologation-photos');

CREATE POLICY "Authenticated users can upload homologation photos" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'homologation-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update homologation photos" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'homologation-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete homologation photos" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'homologation-photos' AND auth.role() = 'authenticated');
