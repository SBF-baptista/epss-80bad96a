
-- Create automation rules table
CREATE TABLE public.regras_automacao (
  id SERIAL PRIMARY KEY,
  modelo_veiculo TEXT NOT NULL,
  tipo_veiculo TEXT,
  modelo_rastreador TEXT NOT NULL,
  configuracao TEXT NOT NULL,
  quantidade_default INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for better query performance on vehicle model lookups
CREATE INDEX idx_regras_automacao_modelo_veiculo ON public.regras_automacao(modelo_veiculo);

-- Enable Row Level Security
ALTER TABLE public.regras_automacao ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to perform all operations
CREATE POLICY "Allow authenticated users full access to automation rules" 
  ON public.regras_automacao 
  FOR ALL 
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime for live updates
ALTER TABLE public.regras_automacao REPLICA IDENTITY FULL;
