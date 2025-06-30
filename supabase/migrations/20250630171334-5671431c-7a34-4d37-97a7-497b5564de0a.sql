
-- Add production tracking columns to the pedidos table
ALTER TABLE pedidos 
ADD COLUMN production_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN production_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN production_notes TEXT;

-- Create production_items table to track individual items in production
CREATE TABLE public.production_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  imei TEXT NOT NULL,
  production_line_code TEXT NOT NULL,
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for production_items
ALTER TABLE public.production_items ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view production items
CREATE POLICY "Users can view production items" 
  ON public.production_items 
  FOR SELECT 
  USING (true);

-- Policy to allow users to insert production items
CREATE POLICY "Users can create production items" 
  ON public.production_items 
  FOR INSERT 
  WITH CHECK (true);

-- Policy to allow users to update production items
CREATE POLICY "Users can update production items" 
  ON public.production_items 
  FOR UPDATE 
  USING (true);

-- Policy to allow users to delete production items
CREATE POLICY "Users can delete production items" 
  ON public.production_items 
  FOR DELETE 
  USING (true);

-- Create index for better performance
CREATE INDEX idx_production_items_pedido_id ON production_items(pedido_id);
CREATE INDEX idx_production_items_imei ON production_items(imei);
