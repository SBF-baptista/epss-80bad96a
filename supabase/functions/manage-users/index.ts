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
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error'
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

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user has admin role using the database function
    console.log('Checking admin role for user:', user.id);
    const { data: hasAdminRole, error: roleError } = await supabaseAdmin
      .rpc('has_role', { 
        _user_id: user.id, 
        _role: 'admin' 
      });

    console.log('Has admin role:', hasAdminRole);
    console.log('Role check error:', roleError);

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(JSON.stringify({ 
        error: 'Role check failed',
        details: roleError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!hasAdminRole) {
      console.log('User does not have admin role');
      return new Response(JSON.stringify({ 
        error: 'Insufficient permissions - Admin role required'
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Admin role verified');

    // Parse request
    let requestData: any = {};
    let action = 'list';

    if (req.method === 'POST') {
      try {
        // Try to get the request body
        const rawBody = await req.text();
        console.log('Raw request body:', rawBody);
        
        if (rawBody) {
          requestData = JSON.parse(rawBody);
          action = requestData.action || 'create';
          console.log('Parsed action:', action);
          console.log('Request data:', requestData);
        } else {
          console.log('Empty request body');
          return new Response(JSON.stringify({ error: 'Empty request body' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
        return new Response(JSON.stringify({ 
          error: 'Invalid request format',
          details: error.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle different actions
    if (req.method === 'POST' && action === 'create') {
      const { email, password, role } = requestData;
      
      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields: email, password, role' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

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

      return new Response(JSON.stringify({ 
        success: true, 
        user: newUser.user,
        message: 'User created successfully'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Default: list users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get roles for all users
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

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

  } catch (error) {
    console.error('Error in manage-users function:', error);
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