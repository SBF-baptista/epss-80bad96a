import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const ALL_MODULES = [
  'kickoff', 'customer_tracking', 'homologation', 'kits', 
  'accessories_supplies', 'planning', 'scheduling', 'kanban', 
  'orders', 'dashboard', 'technicians', 'users'
];

const handler = async (req: Request): Promise<Response> => {
  console.log(`========= NEW REQUEST =========`);
  console.log(`Request method: ${req.method}`);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError?.message);
      return new Response(JSON.stringify({ success: false, error: 'Invalid token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Check admin role
    const { data: userRole } = await supabaseAdmin.rpc('get_user_role', { _user_id: user.id });
    
    if (userRole !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Admin role required' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Parse request
    let requestData: any = {};
    let action = 'list';

    if (req.method === 'POST') {
      const rawBody = await req.text();
      if (rawBody) {
        requestData = JSON.parse(rawBody);
        action = requestData.action || 'create';
      }
    }

    console.log('Action:', action);

    // CREATE USER (via invite - no password)
    if (req.method === 'POST' && action === 'create') {
      const { email, baseRole, permissions, redirectTo, name } = requestData;
      
      if (!email || !baseRole) {
        return new Response(JSON.stringify({ error: 'Missing required fields (email, baseRole)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const validRoles = ['admin', 'gestor', 'operador', 'visualizador'];
      if (!validRoles.includes(baseRole)) {
        return new Response(JSON.stringify({ error: 'Invalid role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo || undefined,
        data: { 
          display_name: name || undefined,
          must_change_password: true
        }
      });

      if (inviteError) {
        return new Response(JSON.stringify({ error: inviteError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const newUserId = inviteData.user!.id;

      await supabaseAdmin.from('usuarios').insert({
        id: newUserId,
        email: email
      });

      await supabaseAdmin.from('user_roles').insert({
        user_id: newUserId,
        role: baseRole
      });

      if (permissions) {
        const permissionRecords = Object.entries(permissions)
          .filter(([_, level]) => level !== 'none')
          .map(([module, level]) => ({
            user_id: newUserId,
            module,
            permission: level
          }));

        if (permissionRecords.length > 0) {
          await supabaseAdmin.from('user_module_permissions').insert(permissionRecords);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        user: inviteData.user,
        message: 'Convite enviado com sucesso! O usuário receberá um e-mail para definir sua senha.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE USER PERMISSIONS
    if (req.method === 'POST' && action === 'update-permissions') {
      const { userId, baseRole, permissions } = requestData;
      
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
          .map(([module, level]) => ({
            user_id: userId,
            module,
            permission: level
          }));

        if (permissionRecords.length > 0) {
          await supabaseAdmin.from('user_module_permissions').insert(permissionRecords);
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Permissions updated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // BAN USER
    if (req.method === 'POST' && action === 'ban-user') {
      const { userId } = requestData;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h'
      });

      if (banError) {
        return new Response(JSON.stringify({ success: false, error: banError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'User banned' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UNBAN USER
    if (req.method === 'POST' && action === 'unban-user') {
      const { userId } = requestData;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none'
      });

      if (unbanError) {
        return new Response(JSON.stringify({ success: false, error: unbanError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'User unbanned' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE USER
    if (req.method === 'POST' && action === 'delete-user') {
      const { userId } = requestData;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (userId === user.id) {
        return new Response(JSON.stringify({ success: false, error: 'Você não pode excluir sua própria conta' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
      await supabaseAdmin.from('user_last_seen').delete().eq('user_id', userId);
      await supabaseAdmin.from('usuarios').delete().eq('id', userId);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        return new Response(JSON.stringify({ success: false, error: deleteError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'User deleted' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // BULK ACTION
    if (req.method === 'POST' && action === 'bulk-action') {
      const { userIds, bulkAction } = requestData;
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0 || !bulkAction) {
        return new Response(JSON.stringify({ error: 'Missing userIds or bulkAction' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const safeIds = userIds.filter((id: string) => id !== user.id);
      if (safeIds.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'Nenhum usuário válido para a ação (você não pode aplicar ações em si mesmo)' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
        message: `${successCount} usuário(s) processado(s) com sucesso${failCount > 0 ? `, ${failCount} falha(s)` : ''}`,
        results 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // UPDATE USER (legacy role update)
    if (req.method === 'POST' && action === 'update') {
      const { userId, role, resetPassword } = requestData;

      if (!userId) {
        return new Response(JSON.stringify({ error: 'Missing userId' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (role) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').insert({ user_id: userId, role });
      }

      if (resetPassword) {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        const tempPassword = Array.from(array, byte => byte.toString(36).padStart(2, '0')).join('').slice(0, 12);
        
        const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { 
            password: tempPassword,
            user_metadata: { must_change_password: true }
          }
        );

        if (passwordError) {
          return new Response(JSON.stringify({ error: 'Failed to reset password' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          success: true, 
          temporaryPassword: tempPassword,
          message: 'Password reset successfully'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'User updated' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // LIST USERS
    console.log('Listing users...');
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

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

    const usersWithRoles = users.users.map(user => {
      const isBanned = !!(user.banned_until && new Date(user.banned_until) > now);
      const realLastSeen = lastSeenMap[user.id] || user.last_sign_in_at || null;
      const lastAccess = realLastSeen ? new Date(realLastSeen) : null;
      const isInactive = !lastAccess || lastAccess < thirtyDaysAgo;
      
      let status: 'active' | 'banned' | 'inactive' = 'active';
      if (isBanned) status = 'banned';
      else if (!lastAccess || isInactive) status = 'inactive';

      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: realLastSeen,
        email_confirmed_at: user.email_confirmed_at,
        confirmed_at: user.confirmed_at,
        banned_until: user.banned_until,
        updated_at: user.updated_at,
        status,
        roles: roles?.filter(r => r.user_id === user.id).map(r => r.role) || [],
        permissions: allPermissions?.filter(p => p.user_id === user.id) || []
      };
    });

    return new Response(JSON.stringify({ success: true, users: usersWithRoles }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in manage-users function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: (error as any)?.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);