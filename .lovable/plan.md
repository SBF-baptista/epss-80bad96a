

# Plan: Fix Permission Synchronization

## Problem Summary
Three interconnected issues cause permissions to not reflect what's configured in the access profile:

1. **Stale legacy data**: `debora.leona@segsat.com` has no `access_profile_id` linked, so the hook falls back to `user_module_permissions` which has old data (kits=approve, accessories_supplies=approve instead of view-only).

2. **Profile edit doesn't sync users**: When you edit a profile's permissions in `AccessProfileModal`, only the `access_profiles` table is updated. The `user_module_permissions` table for all users linked to that profile is NOT refreshed.

3. **Multiple users out of sync**: Several users with a linked profile have divergent permissions in `user_module_permissions` vs their profile definition.

## Changes

### 1. Fix `AccessProfileModal` to sync all linked users on profile save
**File**: `src/components/access-profiles/AccessProfileModal.tsx`

After saving the profile, query all users linked to that profile and call the `manage-users` Edge Function `update-permissions` action for each one. This ensures that editing a profile immediately propagates permissions to all assigned users.

### 2. Run a one-time data fix migration
**Migration SQL**: Resync `user_module_permissions` for ALL users that have a linked `access_profile_id`. This will:
- For each user with an `access_profile_id`, delete their old `user_module_permissions` and insert fresh ones from the profile's JSON.
- Fix `debora.leona@segsat.com` specifically by either linking her to the correct profile or clearing her stale permissions.

### 3. Add debug logging to `useUserRole`
**File**: `src/hooks/useUserRole.tsx`

Add a `console.log` showing the resolved permissions source (profile vs legacy table) so future debugging is easier. This log will show whether the profile path or the fallback path is being used.

## Technical Details

### AccessProfileModal sync logic
```typescript
// After saving profile, sync all linked users
const { data: linkedUsers } = await supabase
  .from('user_roles')
  .select('user_id')
  .eq('access_profile_id', profile.id);

for (const { user_id } of linkedUsers || []) {
  await supabase.functions.invoke('manage-users', {
    body: {
      action: 'update-permissions',
      userId: user_id,
      baseRole: 'operador',
      permissions,
      accessProfileId: profile.id
    }
  });
}
```

### Migration to fix current data
```sql
-- For each user with access_profile_id, resync permissions
DO $$
DECLARE
  rec RECORD;
  profile_perms JSONB;
  mod TEXT;
  perm TEXT;
BEGIN
  FOR rec IN
    SELECT ur.user_id, ur.access_profile_id, ap.permissions, ap.base_role
    FROM user_roles ur
    JOIN access_profiles ap ON ap.id = ur.access_profile_id
    WHERE ur.access_profile_id IS NOT NULL
  LOOP
    -- Clear old permissions
    DELETE FROM user_module_permissions WHERE user_id = rec.user_id;
    
    -- Insert from profile
    FOR mod, perm IN SELECT * FROM jsonb_each_text(rec.permissions)
    LOOP
      IF perm != 'none' THEN
        INSERT INTO user_module_permissions (user_id, module, permission)
        VALUES (rec.user_id, mod::app_module, perm::permission_level);
      END IF;
    END LOOP;
    
    -- Ensure role matches
    UPDATE user_roles SET role = rec.base_role WHERE user_id = rec.user_id;
  END LOOP;
END $$;
```

This also clears stale permissions for users like `debora.leona` who have no profile linked but have old data in `user_module_permissions`.

