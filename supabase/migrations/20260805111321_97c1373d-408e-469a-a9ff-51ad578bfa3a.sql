ALTER TABLE public.frota_tickets
  ALTER COLUMN razao_social DROP NOT NULL,
  ALTER COLUMN cnpj DROP NOT NULL,
  ALTER COLUMN data_atendimento DROP NOT NULL,
  ALTER COLUMN descricao_problema DROP NOT NULL,
  ALTER COLUMN classificacao DROP NOT NULL,
  ALTER COLUMN atendente_suporte DROP NOT NULL,
  ALTER COLUMN canal_entrada DROP NOT NULL,
  ALTER COLUMN produto DROP NOT NULL;