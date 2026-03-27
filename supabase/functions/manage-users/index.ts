import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return jsonResponse({ error: 'Server configuration error' }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse body for POST
    let requestData: any = {};
    let action = 'list';
    if (req.method === 'POST') {
      const rawBody = await req.text();
      if (rawBody) {
        try {
          requestData = JSON.parse(rawBody);
        } catch (parseErr) {
          console.error('Failed to parse request body:', parseErr);
          return jsonResponse({ error: 'Invalid JSON body' }, 400);
        }
        action = requestData.action || 'create';
      }
    }

    console.log(`manage-users action: ${action}`);

    // ===== PUBLIC ACTIONS (no auth required) =====

    // CHECK-EMAIL: verify if email exists and needs password setup
    if (req.method === 'POST' && action === 'check-email') {
      const { email } = requestData;
      if (!email) return jsonResponse({ error: 'Missing email' }, 400);

      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) {
        console.error('Error listing users for check-email:', error);
        return jsonResponse({ exists: false });
      }

      const foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!foundUser) return jsonResponse({ exists: false });

      const needsPasswordSetup = foundUser.user_metadata?.must_change_password === true;
      return jsonResponse({ exists: true, needsPasswordSetup });
    }

    // SETUP-PASSWORD: set password for first-time user (public, no auth)
    if (req.method === 'POST' && action === 'setup-password') {
      const { email, password } = requestData;
      if (!email || !password) return jsonResponse({ error: 'Missing email or password' }, 400);
      if (password.length < 8) return jsonResponse({ error: 'A senha deve ter no mínimo 8 caracteres' }, 400);

      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users for setup-password:', listError);
        return jsonResponse({ error: 'Erro ao buscar usuário' }, 500);
      }

      const foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!foundUser) return jsonResponse({ error: 'E-mail não encontrado no sistema' }, 404);

      if (foundUser.user_metadata?.must_change_password !== true) {
        return jsonResponse({ error: 'Este usuário já possui senha definida. Use o login normal.' }, 400);
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
        password,
        user_metadata: { ...foundUser.user_metadata, must_change_password: false }
      });

      if (updateError) {
        console.error('Error setting password:', updateError);
        return jsonResponse({ error: updateError.message }, 500);
      }

      return jsonResponse({ success: true, message: 'Senha definida com sucesso!' });
    }

    // ===== AUTHENTICATED ACTIONS =====

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid Authorization header');
      return jsonResponse({ success: false, error: 'Missing authorization' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth validation failed:', authError?.message || 'No user returned');
      return jsonResponse({ success: false, error: 'Invalid token' }, 401);
    }
    
    console.log(`Authenticated user: ${user.email} (${user.id})`);
    
    // Check admin role
    const { data: userRole, error: roleError } = await supabaseAdmin.rpc('get_user_role', { _user_id: user.id });
    
    if (roleError) {
      console.error('Error fetching user role:', roleError);
      return jsonResponse({ success: false, error: 'Failed to verify permissions' }, 500);
    }
    
    console.log(`User role: ${userRole}`);
    
    if (userRole !== 'admin') {
      console.error(`Access denied: user ${user.email} has role '${userRole}', admin required`);
      return jsonResponse({ success: false, error: 'Admin role required' }, 403);
    }

    const validRoles = ['admin', 'gestor', 'operador', 'visualizador'];

    const resolveAccessPayload = async (
      payloadBaseRole?: string,
      payloadPermissions?: Record<string, string>,
      payloadAccessProfileId?: string | null,
    ) => {
      const normalizedAccessProfileId = payloadAccessProfileId && payloadAccessProfileId !== 'none'
        ? payloadAccessProfileId
        : null;

      let resolvedBaseRole = payloadBaseRole;
      let resolvedPermissions = payloadPermissions || {};

      if (normalizedAccessProfileId) {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('access_profiles')
          .select('id, base_role, permissions')
          .eq('id', normalizedAccessProfileId)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching access profile:', profileError);
          return { error: 'Failed to load access profile: ' + profileError.message };
        }

        if (!profile) {
          return { error: 'Access profile not found' };
        }

        resolvedBaseRole = profile.base_role;
        resolvedPermissions = (profile.permissions as Record<string, string>) || {};
      }

      if (!resolvedBaseRole || !validRoles.includes(resolvedBaseRole)) {
        return { error: 'Invalid role' };
      }

      return {
        accessProfileId: normalizedAccessProfileId,
        baseRole: resolvedBaseRole,
        permissions: resolvedPermissions,
      };
    };

    // CREATE USER
    if (req.method === 'POST' && action === 'create') {
      const { email, baseRole, permissions, name, accessProfileId } = requestData;

      if (!email) return jsonResponse({ error: 'Missing required field (email)' }, 400);

      const resolvedPayload = await resolveAccessPayload(baseRole, permissions, accessProfileId);
      if ('error' in resolvedPayload) {
        return jsonResponse({ error: resolvedPayload.error }, 400);
      }

      const { baseRole: resolvedBaseRole, permissions: resolvedPermissions, accessProfileId: resolvedAccessProfileId } = resolvedPayload;

      // Generate random internal password
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const internalPassword = Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 24);

      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: internalPassword,
        email_confirm: true,
        user_metadata: {
          display_name: name || undefined,
          must_change_password: true
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        let errorMsg = createError.message;
        if (errorMsg.includes('already been registered') || errorMsg.includes('already exists')) {
          errorMsg = 'Este e-mail já está cadastrado no sistema';
        }
        return jsonResponse({ success: false, error: errorMsg }, 400);
      }

      const newUserId = createData.user!.id;
      console.log(`Created auth user: ${newUserId}`);

      const { error: usuarioErr } = await supabaseAdmin.from('usuarios').insert({ id: newUserId, email });
      if (usuarioErr) console.error('Error inserting into usuarios:', usuarioErr);

      const roleInsert: any = { user_id: newUserId, role: resolvedBaseRole };
      if (resolvedAccessProfileId) roleInsert.access_profile_id = resolvedAccessProfileId;
      const { error: roleInsertErr } = await supabaseAdmin.from('user_roles').insert(roleInsert);
      if (roleInsertErr) console.error('Error inserting role:', roleInsertErr);

      const permissionRecords = Object.entries(resolvedPermissions)
        .filter(([_, level]) => level !== 'none')
        .map(([module, level]) => ({ user_id: newUserId, module, permission: level }));

      if (permissionRecords.length > 0) {
        const { error: permErr } = await supabaseAdmin.from('user_module_permissions').insert(permissionRecords);
        if (permErr) console.error('Error inserting permissions:', permErr);
      }

      return jsonResponse({ success: true, user: createData.user, message: 'Usuário criado com sucesso!' });
    }

    // UPDATE USER PERMISSIONS - profile is the source of truth when linked
    if (req.method === 'POST' && action === 'update-permissions') {
      const { userId, baseRole, permissions, accessProfileId } = requestData;
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);

      const resolvedPayload = await resolveAccessPayload(baseRole, permissions, accessProfileId);
      if ('error' in resolvedPayload) {
        return jsonResponse({ error: resolvedPayload.error }, 400);
      }

      const {
        baseRole: resolvedBaseRole,
        permissions: resolvedPermissions,
        accessProfileId: resolvedAccessProfileId,
      } = resolvedPayload;

      console.log(`update-permissions: userId=${userId}, resolvedBaseRole=${resolvedBaseRole}, accessProfileId=${resolvedAccessProfileId}, callerUserId=${user.id}`);

      const { data: existingRole, error: checkErr } = await supabaseAdmin
        .from('user_roles')
        .select('id, role, access_profile_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkErr) {
        console.error('Error checking existing role:', checkErr);
        return jsonResponse({ error: 'Failed to check existing role' }, 500);
      }

      if (existingRole) {
        const { error: updateErr } = await supabaseAdmin
          .from('user_roles')
          .update({
            role: resolvedBaseRole,
            access_profile_id: resolvedAccessProfileId,
          })
          .eq('user_id', userId);

        if (updateErr) {
          console.error('Error updating role:', updateErr);
          return jsonResponse({ error: 'Failed to update role: ' + updateErr.message }, 500);
        }
      } else {
        const { error: insertErr } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role: resolvedBaseRole,
            access_profile_id: resolvedAccessProfileId,
          });

        if (insertErr) {
          console.error('Error inserting role:', insertErr);
          return jsonResponse({ error: 'Failed to insert role: ' + insertErr.message }, 500);
        }
      }

      const { error: delErr } = await supabaseAdmin
        .from('user_module_permissions')
        .delete()
        .eq('user_id', userId);

      if (delErr) {
        console.error('Error deleting old permissions:', delErr);
        return jsonResponse({ error: 'Failed to clear old permissions: ' + delErr.message }, 500);
      }

      const permissionRecords = Object.entries(resolvedPermissions)
        .filter(([_, level]) => level !== 'none')
        .map(([module, level]) => ({ user_id: userId, module, permission: level }));

      if (permissionRecords.length > 0) {
        const { error: insErr } = await supabaseAdmin
          .from('user_module_permissions')
          .insert(permissionRecords);

        if (insErr) {
          console.error('Error inserting new permissions:', insErr);
          return jsonResponse({ error: 'Failed to insert permissions: ' + insErr.message }, 500);
        }
      }

      console.log(`Synchronized ${permissionRecords.length} permissions for ${userId}`);
      return jsonResponse({ success: true, message: 'Permissions updated' });
    }

    // BAN USER
    if (req.method === 'POST' && action === 'ban-user') {
      const { userId } = requestData;
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);
      if (userId === user.id) return jsonResponse({ success: false, error: 'Você não pode banir a si mesmo' }, 400);
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (banError) {
        console.error('Error banning user:', banError);
        return jsonResponse({ success: false, error: banError.message }, 500);
      }
      return jsonResponse({ success: true, message: 'User banned' });
    }

    // UNBAN USER
    if (req.method === 'POST' && action === 'unban-user') {
      const { userId } = requestData;
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      if (unbanError) {
        console.error('Error unbanning user:', unbanError);
        return jsonResponse({ success: false, error: unbanError.message }, 500);
      }
      return jsonResponse({ success: true, message: 'User unbanned' });
    }

    // DELETE USER
    if (req.method === 'POST' && action === 'delete-user') {
      const { userId } = requestData;
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);
      if (userId === user.id) return jsonResponse({ success: false, error: 'Você não pode excluir sua própria conta' }, 400);
      
      console.log(`Deleting user: ${userId}`);
      await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_last_seen').delete().eq('user_id', userId);
      await supabaseAdmin.from('usuarios').delete().eq('id', userId);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error('Error deleting user:', deleteError);
        return jsonResponse({ success: false, error: deleteError.message }, 500);
      }
      return jsonResponse({ success: true, message: 'User deleted' });
    }

    // BULK ACTION
    if (req.method === 'POST' && action === 'bulk-action') {
      const { userIds, bulkAction } = requestData;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !bulkAction) {
        return jsonResponse({ error: 'Missing userIds or bulkAction' }, 400);
      }
      const safeIds = userIds.filter((id: string) => id !== user.id);
      if (safeIds.length === 0) {
        return jsonResponse({ success: false, error: 'Nenhum usuário válido para a ação' }, 400);
      }
      const results: { id: string; success: boolean; error?: string }[] = [];
      for (const uid of safeIds) {
        try {
          if (bulkAction === 'ban') {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, { ban_duration: '876000h' });
            results.push({ id: uid, success: !error, error: error?.message });
          } else if (bulkAction === 'unban') {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(uid, { ban_duration: 'none' });
            results.push({ id: uid, success: !error, error: error?.message });
          } else if (bulkAction === 'delete') {
            await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', uid);
            await supabaseAdmin.from('user_roles').delete().eq('user_id', uid);
            await supabaseAdmin.from('user_last_seen').delete().eq('user_id', uid);
            await supabaseAdmin.from('usuarios').delete().eq('id', uid);
            const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
            results.push({ id: uid, success: !error, error: error?.message });
          }
        } catch (e: any) {
          results.push({ id: uid, success: false, error: e.message });
        }
      }
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      return jsonResponse({ 
        success: true, 
        message: `${successCount} usuário(s) processado(s)${failCount > 0 ? `, ${failCount} falha(s)` : ''}`,
        results 
      });
    }

    // RESET ACCESS
    if (req.method === 'POST' && action === 'reset-access') {
      const { userId } = requestData;
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);
      if (userId === user.id) return jsonResponse({ success: false, error: 'Você não pode resetar seu próprio acesso' }, 400);

      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      const internalPassword = Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 24);

      const { data: targetUser, error: fetchErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (fetchErr || !targetUser?.user) {
        console.error('Error fetching user for reset:', fetchErr);
        return jsonResponse({ success: false, error: 'Usuário não encontrado' }, 404);
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: internalPassword,
        user_metadata: { ...targetUser.user.user_metadata, must_change_password: true },
        ban_duration: 'none'
      });

      if (updateError) {
        console.error('Error resetting access:', updateError);
        return jsonResponse({ success: false, error: updateError.message }, 500);
      }

      return jsonResponse({ success: true, message: 'Acesso resetado. O usuário precisará definir uma nova senha no próximo login.' });
    }

    // UPDATE USER (legacy)
    if (req.method === 'POST' && action === 'update') {
      const { userId, role, resetPassword } = requestData;
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);
      
      if (role) {
        // Use safe update pattern instead of delete+insert
        const { data: existing } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          const { error: updateErr } = await supabaseAdmin
            .from('user_roles')
            .update({ role })
            .eq('user_id', userId);
          if (updateErr) console.error('Error updating role:', updateErr);
        } else {
          const { error: insertErr } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role });
          if (insertErr) console.error('Error inserting role:', insertErr);
        }
      }
      
      if (resetPassword) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const tempPassword = Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 12);
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, { 
          password: tempPassword,
          user_metadata: { must_change_password: true }
        });
        if (passwordError) {
          console.error('Error resetting password:', passwordError);
          return jsonResponse({ error: 'Failed to reset password' }, 500);
        }
        return jsonResponse({ success: true, temporaryPassword: tempPassword, message: 'Password reset successfully' });
      }
      return jsonResponse({ success: true, message: 'User updated' });
    }

    // LIST USERS (default action for GET or POST without specific action)
    console.log('Listing users...');
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) {
      console.error('Error listing users:', usersError);
      return jsonResponse({ error: 'Failed to fetch users' }, 500);
    }

    const { data: roles, error: rolesErr } = await supabaseAdmin.from('user_roles').select('user_id, role, access_profile_id');
    if (rolesErr) console.error('Error fetching roles:', rolesErr);
    
    const { data: allPermissions, error: permsErr } = await supabaseAdmin.from('user_module_permissions').select('*');
    if (permsErr) console.error('Error fetching permissions:', permsErr);
    
    const { data: lastSeenData, error: lastSeenErr } = await supabaseAdmin.from('user_last_seen').select('user_id, last_seen_at');
    if (lastSeenErr) console.error('Error fetching last_seen:', lastSeenErr);

    const lastSeenMap: Record<string, string> = {};
    if (lastSeenData) {
      for (const entry of lastSeenData) {
        lastSeenMap[entry.user_id] = entry.last_seen_at;
      }
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const usersWithRoles = users.users.map(u => {
      const isBanned = !!(u.banned_until && new Date(u.banned_until) > now);
      const realLastSeen = lastSeenMap[u.id] || u.last_sign_in_at || null;
      const lastAccess = realLastSeen ? new Date(realLastSeen) : null;
      const isInactive = !lastAccess || lastAccess < thirtyDaysAgo;
      
      let status: 'active' | 'banned' | 'inactive' = 'active';
      if (isBanned) status = 'banned';
      else if (!lastAccess || isInactive) status = 'inactive';

      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: realLastSeen,
        email_confirmed_at: u.email_confirmed_at,
        confirmed_at: u.confirmed_at,
        banned_until: u.banned_until,
        updated_at: u.updated_at,
        status,
        roles: roles?.filter(r => r.user_id === u.id).map(r => r.role) || [],
        permissions: allPermissions?.filter(p => p.user_id === u.id) || []
      };
    });

    console.log(`Listed ${usersWithRoles.length} users`);
    return jsonResponse({ success: true, users: usersWithRoles });

  } catch (error) {
    console.error('Unhandled error in manage-users function:', error);
    return jsonResponse({ 
      error: 'Internal server error', 
      details: (error as any)?.message || 'Unknown error'
    }, 500);
  }
};

serve(handler);
