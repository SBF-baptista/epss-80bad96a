-- Add columns to store Segsale IDs for fetching accessories later
ALTER TABLE incoming_vehicles 
  ADD COLUMN id_resumo_venda INTEGER,
  ADD COLUMN id_contrato_pendente INTEGER;