import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  baseRole: 'admin' | 'gestor' | 'operador' | 'visualizador';
  permissions?: Record<string, string>;
}

interface UpdateUserRequest {
  userId: string;
  baseRole?: 'admin' | 'gestor' | 'operador' | 'visualizador';
  permissions?: Record<string, string>;
  resetPassword?: boolean;
}

const ALL_MODULES = [
  'kickoff', 'customer_tracking', 'homologation', 'kits', 
  'accessories_supplies', 'planning', 'scheduling', 'kanban', 
  'orders', 'dashboard', 'technicians', 'users'
];

const handler = async (req: Request): Promise<Response> => {
  console.log(`========= NEW REQUEST =========`);
  console.log(`Request method: ${req.method}`);
  
  // Handle CORS preflight requests
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

    // CREATE USER
    if (req.method === 'POST' && action === 'create') {
      const { email, password, baseRole, permissions } = requestData;
      
      if (!email || !password || !baseRole) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create user profile
      await supabaseAdmin.from('usuarios').insert({
        id: newUser.user!.id,
        email: newUser.user!.email!
      });

      // Assign base role
      await supabaseAdmin.from('user_roles').insert({
        user_id: newUser.user!.id,
        role: baseRole
      });

      // Set module permissions
      if (permissions) {
        const permissionRecords = Object.entries(permissions)
          .filter(([_, level]) => level !== 'none')
          .map(([module, level]) => ({
            user_id: newUser.user!.id,
            module,
            permission: level
          }));

        if (permissionRecords.length > 0) {
          await supabaseAdmin.from('user_module_permissions').insert(permissionRecords);
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'User created successfully'
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

      // Update base role
      if (baseRole) {
        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
        await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: baseRole });
      }

      // Update module permissions
      if (permissions) {
        // Delete existing permissions
        await supabaseAdmin.from('user_module_permissions').delete().eq('user_id', userId);
        
        // Insert new permissions
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
          { password: tempPassword }
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

    // Get roles for all users
    const { data: roles } = await supabaseAdmin.from('user_roles').select('user_id, role');
    
    // Get permissions for all users
    const { data: allPermissions } = await supabaseAdmin.from('user_module_permissions').select('*');

    const usersWithRoles = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      roles: roles?.filter(r => r.user_id === user.id).map(r => r.role) || [],
      permissions: allPermissions?.filter(p => p.user_id === user.id) || []
    }));

    return new Response(JSON.stringify({ users: usersWithRoles }), {
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
