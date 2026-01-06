-- Backfill missing usage_type inside kickoff_history.vehicles_data based on incoming_vehicles.id
-- This fixes the "Produto" column for existing kickoff history records.

UPDATE public.kickoff_history kh
SET vehicles_data = sub.updated_vehicles_data
FROM (
  SELECT
    kh2.id AS kickoff_history_id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN iv.usage_type IS NULL THEN v.vehicle
          ELSE jsonb_set(
            v.vehicle,
            '{usage_type}',
            to_jsonb(iv.usage_type::text),
            true
          )
        END
        ORDER BY v.ord
      ),
      '[]'::jsonb
    ) AS updated_vehicles_data
  FROM public.kickoff_history kh2
  LEFT JOIN LATERAL jsonb_array_elements(kh2.vehicles_data) WITH ORDINALITY AS v(vehicle, ord)
    ON true
  LEFT JOIN public.incoming_vehicles iv
    ON iv.id = (v.vehicle->>'id')::uuid
  GROUP BY kh2.id
) sub
WHERE kh.id = sub.kickoff_history_id
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(kh.vehicles_data) AS e
    WHERE (e->>'usage_type') IS NULL OR (e->>'usage_type') = ''
  );