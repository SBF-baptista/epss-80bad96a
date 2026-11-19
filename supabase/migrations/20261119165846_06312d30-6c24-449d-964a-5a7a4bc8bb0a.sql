DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS t, c.conname, a.attname
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
    WHERE c.contype='f' AND c.confrelid='auth.users'::regclass AND c.confdeltype NOT IN ('c','n')
      AND c.connamespace='public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.t, r.conname);
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL', r.t, r.conname, r.attname);
  END LOOP;
END $$;