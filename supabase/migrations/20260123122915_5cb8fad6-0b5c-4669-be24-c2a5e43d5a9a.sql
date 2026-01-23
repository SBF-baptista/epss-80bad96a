-- Soft delete all homologation cards with notes containing "Criado do kickoff para"
UPDATE homologation_cards 
SET deleted_at = now() 
WHERE notes LIKE '%Criado do kickoff para%' 
AND deleted_at IS NULL;