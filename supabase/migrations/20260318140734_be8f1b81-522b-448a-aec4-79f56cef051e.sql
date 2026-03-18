
-- Resync user_module_permissions for ALL users with access_profile_id
DO $$
DECLARE
  rec RECORD;
  mod TEXT;
  perm TEXT;
BEGIN
  -- For each user linked to a profile, resync their permissions
  FOR rec IN
    SELECT ur.user_id, ur.access_profile_id, ap.permissions, ap.base_role
    FROM user_roles ur
    JOIN access_profiles ap ON ap.id = ur.access_profile_id
    WHERE ur.access_profile_id IS NOT NULL
  LOOP
    -- Clear old permissions
    DELETE FROM user_module_permissions WHERE user_id = rec.user_id;
    
    -- Insert from profile
    FOR mod, perm IN SELECT * FROM jsonb_each_text(rec.permissions::jsonb)
    LOOP
      IF perm != 'none' THEN
        INSERT INTO user_module_permissions (user_id, module, permission)
        VALUES (rec.user_id, mod::app_module, perm::permission_level)
        ON CONFLICT (user_id, module) DO UPDATE SET permission = EXCLUDED.permission;
      END IF;
    END LOOP;
    
    -- Ensure base role matches
    UPDATE user_roles SET role = rec.base_role WHERE user_id = rec.user_id;
  END LOOP;

  -- Link debora.leona to Gestor de operações profile and sync
  UPDATE user_roles 
  SET access_profile_id = 'e8eb2708-bd15-4595-af80-845fa0ee1d1d', role = 'operador'
  WHERE user_id = '9fb162fe-01fa-4147-b04f-9d1e8fc24b00';

  -- Clear debora's stale permissions
  DELETE FROM user_module_permissions WHERE user_id = '9fb162fe-01fa-4147-b04f-9d1e8fc24b00';

  -- Insert correct permissions from Gestor de operações profile
  INSERT INTO user_module_permissions (user_id, module, permission) VALUES
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'accessories_supplies', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'customer_tracking', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'dashboard', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'kanban', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'kits', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'orders', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'planning', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'scheduling', 'view'),
  ('9fb162fe-01fa-4147-b04f-9d1e8fc24b00', 'technicians', 'edit')
  ON CONFLICT (user_id, module) DO UPDATE SET permission = EXCLUDED.permission;
END $$;
