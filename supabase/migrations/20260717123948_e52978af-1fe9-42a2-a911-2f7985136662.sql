UPDATE auth.users
SET encrypted_password = crypt(gen_random_uuid()::text || gen_random_uuid()::text, gen_salt('bf')),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"must_change_password": true}'::jsonb,
    banned_until = NULL,
    updated_at = now()
WHERE id = 'f1277b24-70c4-4107-8c92-42a6834847e9';