import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
        requestData = JSON.parse(rawBody);
        action = requestData.action || 'create';
      }
    }

    // ===== PUBLIC ACTIONS (no auth required) =====

    // CHECK-EMAIL: verify if email exists and needs password setup
    if (req.method === 'POST' && action === 'check-email') {
      const { email } = requestData;
      if (!email) {
        return new Response(JSON.stringify({ error: 'Missing email' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // List users filtered by email
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      if (error) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!foundUser) {
        return new Response(JSON.stringify({ exists: false }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const needsPasswordSetup = foundUser.user_metadata?.must_change_password === true;
      
      return new Response(JSON.stringify({ 
        exists: true, 
        needsPasswordSetup 
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // SETUP-PASSWORD: set password for first-time user (public, no auth)
    if (req.method === 'POST' && action === 'setup-password') {
      const { email, password } = requestData;
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'Missing email or password' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (password.length < 8) {
        return new Response(JSON.stringify({ error: 'A senha deve ter no mínimo 8 caracteres' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Find the user
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return new Response(JSON.stringify({ error: 'Erro ao buscar usuário' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const foundUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!foundUser) {
        return new Response(JSON.stringify({ error: 'E-mail não encontrado no sistema' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Only allow if must_change_password is true
      if (foundUser.user_metadata?.must_change_password !== true) {
        return new Response(JSON.stringify({ error: 'Este usuário já possui senha definida. Use o login normal.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Set the password and clear the flag
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(foundUser.id, {
        password,
        user_metadata: { ...foundUser.user_metadata, must_change_password: false }
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Senha definida com sucesso!' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== AUTHENTICATED ACTIONS =====

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    const { data: userRole } = await supabaseAdmin.rpc('get_user_role', { _user_id: user.id });
    
    if (userRole !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Admin role required' }), { 
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // CREATE USER (admin creates with random internal password, user sets own later)
    if (req.method === 'POST' && action === 'create') {
      const { email, baseRole, permissions, name, accessProfileId } = requestData;
      
      if (!email || !baseRole) {
        return new Response(JSON.stringify({ error: 'Missing required fields (email, baseRole)' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const validRoles = ['admin', 'gestor', 'operador', 'visualizador'];
      if (!validRoles.includes(baseRole)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate random internal password (user will never see this)
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
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const newUserId = createData.user!.id;

      await supabaseAdmin.from('usuarios').insert({ id: newUserId, email });

      const roleInsert: any = { user_id: newUserId, role: baseRole };
      if (accessProfileId) roleInsert.access_profile_id = accessProfileId;
      await supabaseAdmin.from('user_roles').insert(roleInsert);

      if (permissions) {
        const permissionRecords = Object.entries(permissions)
          .filter(([_, level]) => level !== 'none')
          .map(([module, level]) => ({ user_id: newUserId, module, permission: level }));
        if (permissionRecords.length > 0) {
          await supabaseAdmin.from('user_module_permissions').insert(permissionRecords);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        user: createData.user,
        message: 'Usuário criado com sucesso!'
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE USER PERMISSIONS
    if (req.method === 'POST' && action === 'update-permissions') {
      const { userId, baseRole, permissions } = requestData;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (baseRole) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: baseRole });
      }
      if (permissions) {
        await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', userId);
        const permissionRecords = Object.entries(permissions)
          .filter(([_, level]) => level !== 'none')
          .map(([module, level]) => ({ user_id: userId, module, permission: level }));
        if (permissionRecords.length > 0) {
          await supabaseAdmin.from('user_module_permissions').insert(permissionRecords);
        }
      }
      return new Response(JSON.stringify({ success: true, message: 'Permissions updated' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // BAN USER
    if (req.method === 'POST' && action === 'ban-user') {
      const { userId } = requestData;
      if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: '876000h' });
      if (banError) return new Response(JSON.stringify({ success: false, error: banError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, message: 'User banned' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // UNBAN USER
    if (req.method === 'POST' && action === 'unban-user') {
      const { userId } = requestData;
      if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
      if (unbanError) return new Response(JSON.stringify({ success: false, error: unbanError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, message: 'User unbanned' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // DELETE USER
    if (req.method === 'POST' && action === 'delete-user') {
      const { userId } = requestData;
      if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (userId === user.id) return new Response(JSON.stringify({ success: false, error: 'Você não pode excluir sua própria conta' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_last_seen').delete().eq('user_id', userId);
      await supabaseAdmin.from('usuarios').delete().eq('id', userId);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) return new Response(JSON.stringify({ success: false, error: deleteError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ success: true, message: 'User deleted' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // BULK ACTION
    if (req.method === 'POST' && action === 'bulk-action') {
      const { userIds, bulkAction } = requestData;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !bulkAction) {
        return new Response(JSON.stringify({ error: 'Missing userIds or bulkAction' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const safeIds = userIds.filter((id: string) => id !== user.id);
      if (safeIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Nenhum usuário válido para a ação' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
      return new Response(JSON.stringify({ 
        success: true, 
        message: `${successCount} usuário(s) processado(s)${failCount > 0 ? `, ${failCount} falha(s)` : ''}`,
        results 
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // UPDATE USER (legacy)
    if (req.method === 'POST' && action === 'update') {
      const { userId, role, resetPassword } = requestData;
      if (!userId) return new Response(JSON.stringify({ error: 'Missing userId' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (role) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').insert({ user_id: userId, role });
      }
      if (resetPassword) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const tempPassword = Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 12);
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, { 
          password: tempPassword,
          user_metadata: { must_change_password: true }
        });
        if (passwordError) return new Response(JSON.stringify({ error: 'Failed to reset password' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        return new Response(JSON.stringify({ success: true, temporaryPassword: tempPassword, message: 'Password reset successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: 'User updated' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // LIST USERS
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    if (usersError) return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: roles } = await supabaseAdmin.from('user_roles').select('user_id, role');
    const { data: allPermissions } = await supabaseAdmin.from('user_module_permissions').select('*');
    const { data: lastSeenData } = await supabaseAdmin.from('user_last_seen').select('user_id, last_seen_at');

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

    return new Response(JSON.stringify({ success: true, users: usersWithRoles }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in manage-users function:', error);
    return new Response(JSON.stringify({ error: 'Internal server error', details: (error as any)?.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
