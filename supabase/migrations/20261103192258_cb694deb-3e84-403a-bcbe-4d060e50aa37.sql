CREATE OR REPLACE FUNCTION public.normalize_item_name(p_value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN p_value IS NULL THEN NULL ELSE
    regexp_replace(
      regexp_replace(lower(trim(normalize(p_value, NFD))), '[\u0300-\u036f]', '', 'g'),
      '\s+', ' ', 'g')
  END
$$;
GRANT EXECUTE ON FUNCTION public.normalize_item_name(text) TO authenticated, service_role;