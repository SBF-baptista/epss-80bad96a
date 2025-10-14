-- Adicionar coluna categories
ALTER TABLE accessories ADD COLUMN IF NOT EXISTS categories text;

-- Renomear coluna accessory_name para name
ALTER TABLE accessories RENAME COLUMN accessory_name TO name;

-- Atualizar valores existentes de categories baseado no tipo de item
UPDATE accessories 
SET categories = CASE 
  WHEN name ILIKE '%módulo%' OR name ILIKE '%gestão%' OR name ILIKE '%ranking%' THEN 'Módulos'
  ELSE 'Acessórios'
END
WHERE categories IS NULL;