-- 1) Deduplicar OLIVIA (sale_summary_id=11290): manter o mais antigo, deletar o resto
DELETE FROM public.kickoff_history
WHERE sale_summary_id = 11290
  AND id NOT IN (
    SELECT id FROM public.kickoff_history
    WHERE sale_summary_id = 11290
    ORDER BY approved_at ASC
    LIMIT 1
  );

-- 2) Fechar o card pendente do veículo da OLIVIA (SOU8A65)
UPDATE public.incoming_vehicles
SET kickoff_completed = true
WHERE sale_summary_id = 11290
  AND plate = 'SOU8A65';

-- 3) Trava única por venda no histórico de kickoff
ALTER TABLE public.kickoff_history
  ADD CONSTRAINT kickoff_history_sale_summary_id_unique UNIQUE (sale_summary_id);