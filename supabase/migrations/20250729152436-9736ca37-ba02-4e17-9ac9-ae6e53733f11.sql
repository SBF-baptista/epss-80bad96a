UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    confirmed_at = NOW(),
    email_change_confirm_status = 0
WHERE email = 'welklin@segsat.com';