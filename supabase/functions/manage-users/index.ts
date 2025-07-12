import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  email: string;
  password: string;
  role: 'admin' | 'installer';
}

interface UpdateUserRequest {
  userId: string;
  role?: 'admin' | 'installer';
  resetPassword?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log(`Request method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('Service Key:', supabaseServiceKey ? 'Present (length: ' + supabaseServiceKey?.length + ')' : 'Missing');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error',
        details: `Missing: ${!supabaseUrl ? 'SUPABASE_URL ' : ''}${!supabaseServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Supabase admin client created');

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted, length:', token.length);
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.log('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('User authenticated:', user.email);

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.log('Role check error:', roleError);
    }
    
    if (!roleData) {
      console.log('No admin role found for user');
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin role verified');

    const method = req.method;
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || (method === 'GET' ? 'list' : 'create');

    console.log(`Action: ${action}`);

    if (method === 'POST' && action === 'create') {
      const bodyText = await req.text();
      console.log('Request body:', bodyText);
      
      let requestData;
      try {
        requestData = JSON.parse(bodyText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const { email, password, role }: CreateUserRequest = requestData;
      
      console.log(`Creating user: ${email} with role: ${role}`);

      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

      if (createError) {
        console.error('Error creating user:', createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('User created successfully:', newUser.user?.id);

      // Create user profile in usuarios table
      const { error: profileError } = await supabaseAdmin
        .from('usuarios')
        .insert({
          id: newUser.user!.id,
          email: newUser.user!.email!
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // Assign role
      const { error: roleAssignError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user!.id,
          role
        });

      if (roleAssignError) {
        console.error('Error assigning role:', roleAssignError);
        return new Response(JSON.stringify({ error: 'Failed to assign role' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('User created and role assigned successfully');

      return new Response(JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'User created successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'POST' && action === 'update') {
      const { userId, role, resetPassword }: UpdateUserRequest = await req.json();

      if (role) {
        // Update user role
        const { error: roleUpdateError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        if (!roleUpdateError) {
          await supabaseAdmin
            .from('user_roles')
            .insert({
              user_id: userId,
              role
            });
        }
      }

      if (resetPassword) {
        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        
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

      return new Response(JSON.stringify({ 
        success: true,
        message: 'User updated successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET' && action === 'list') {
      // Get all users with their roles
      const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (usersError) {
        return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get roles for all users
      const { data: roles, error: rolesError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const usersWithRoles = users.users.map(user => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        roles: roles?.filter(r => r.user_id === user.id).map(r => r.role) || []
      }));

      return new Response(JSON.stringify({ users: usersWithRoles }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in manage-users function:', error);
    console.error('Error stack:', error.stack);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);