-- Create table for automation rule photos
CREATE TABLE public.automation_rule_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_rule_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.automation_rule_photos 
ADD CONSTRAINT fk_automation_rule_photos_rule_id 
FOREIGN KEY (automation_rule_id) 
REFERENCES public.automation_rules_extended(id) 
ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.automation_rule_photos ENABLE ROW LEVEL SECURITY;

-- Create policies for automation rule photos
CREATE POLICY "Allow authenticated users to view automation rule photos" 
ON public.automation_rule_photos 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert automation rule photos" 
ON public.automation_rule_photos 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update automation rule photos" 
ON public.automation_rule_photos 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete automation rule photos" 
ON public.automation_rule_photos 
FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create storage bucket for automation rule photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('automation-rule-photos', 'automation-rule-photos', true);

-- Create storage policies for automation rule photos
CREATE POLICY "Allow authenticated users to view automation rule photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'automation-rule-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to upload automation rule photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'automation-rule-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update automation rule photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'automation-rule-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete automation rule photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'automation-rule-photos' AND auth.role() = 'authenticated');