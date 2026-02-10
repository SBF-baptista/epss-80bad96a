
-- Create table for WhatsApp message logs
CREATE TABLE public.whatsapp_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_sid TEXT,
  recipient_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  template_type TEXT,
  message_content TEXT,
  initial_status TEXT,
  final_status TEXT,
  error_code INTEGER,
  error_message TEXT,
  friendly_message TEXT,
  dispatch_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'automatic'
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_message_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read logs
CREATE POLICY "Authenticated users can view message logs"
ON public.whatsapp_message_logs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow service role to insert (edge functions use service role)
CREATE POLICY "Service role can insert message logs"
ON public.whatsapp_message_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_whatsapp_logs_sent_at ON public.whatsapp_message_logs (sent_at DESC);
CREATE INDEX idx_whatsapp_logs_recipient ON public.whatsapp_message_logs (recipient_phone);
