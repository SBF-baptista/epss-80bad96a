

# Plan: Fix 4 Issues (Logout, First Login, Edge Function, Users)

## Root Cause Analysis

### Issue 1 - Logout button not working
The auth logs show repeated `session_not_found` errors on `/logout`. The 30-minute inactivity timeout invalidates the session, but `signOut()` in `useAuth.tsx` calls `logLogout()` first (which also needs a valid session). When both fail, the user stays stuck. **Fix**: Make logout resilient -- clear local state and navigate to login regardless of API errors.

### Issue 3 & 4 - Edge function error + Users disappeared (same root cause)
The `manage-users` edge function has **outdated CORS headers** -- missing the newer Supabase client headers (`x-supabase-client-platform`, etc.). The browser blocks the preflight or the response. Additionally, `manage-users` is not listed in `config.toml`, defaulting to `verify_jwt = true`, which causes failures when the gateway can't validate the token. **Fix**: Update CORS headers and add to config.toml with `verify_jwt = false` (function already does its own auth check).

### Issue 2 - First login password setup
Users invited by admin receive an invite email linking to `/ativar`. However, if a user logs in with a temporary/reset password, there's no mechanism to force password setup. **Fix**: After successful login, check if the user has a flag (e.g., `user_metadata`) indicating they need to set a password, and redirect to `/ativar` or a dedicated screen.

## Changes

### 1. Fix logout (`src/hooks/useAuth.tsx`)
- Wrap `logLogout()` in try-catch so it never blocks signOut
- After `signOut()`, always clear local state and redirect to `/auth` even if the API returns an error
- Clear localStorage session data as fallback

### 2. Fix `manage-users` edge function (`supabase/functions/manage-users/index.ts`)
- Update CORS headers to include all required Supabase client headers
- Add `verify_jwt = false` to `supabase/config.toml` for `manage-users`

### 3. First login password redirect (`src/pages/Auth.tsx` + `src/hooks/useAuth.tsx`)
- After successful login, check `user.user_metadata.must_change_password` or detect if user was invited (no `confirmed_at` or first login)
- If first login detected, redirect to `/ativar` to set a proper password
- In the `manage-users` edge function, set `user_metadata.must_change_password = true` when creating users via invite
- In `ActivateAccount.tsx`, clear the flag after password is set

### 4. Users list fix
- This is resolved by fix #2 (CORS + config.toml). Once the edge function responds correctly, users will load again.

## Files Modified
- `src/hooks/useAuth.tsx` - Resilient logout + first login detection
- `src/pages/Auth.tsx` - Redirect on first login
- `supabase/functions/manage-users/index.ts` - CORS headers fix
- `supabase/config.toml` - Add manage-users entry
- `src/pages/ActivateAccount.tsx` - Clear must_change_password flag

