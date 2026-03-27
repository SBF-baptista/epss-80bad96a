
-- Create homologation_files table
CREATE TABLE public.homologation_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homologation_card_id UUID NOT NULL REFERENCES public.homologation_cards(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.homologation_files ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view homologation files"
  ON public.homologation_files FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert homologation files"
  ON public.homologation_files FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete homologation files"
  ON public.homologation_files FOR DELETE TO authenticated USING (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('homologation-files', 'homologation-files', true);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload homologation files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'homologation-files');

CREATE POLICY "Anyone can view homologation files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'homologation-files');

CREATE POLICY "Authenticated users can delete homologation files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'homologation-files');
