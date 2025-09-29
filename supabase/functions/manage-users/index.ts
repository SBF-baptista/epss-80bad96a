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
  console.log(`========= NEW REQUEST =========`);
  console.log(`Request method: ${req.method}`);
  console.log(`Request URL: ${req.url}`);
  
  // Log all headers for debugging
  console.log('All headers:');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') {
      console.log(`  ${key}: Bearer ${value.substring(7, 20)}...`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Returning CORS preflight response');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Simple authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Missing or invalid authorization header' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For now, just check that the token exists - Supabase will validate it
    console.log('Authorization header present, proceeding...');

    // Parse request
    let requestData: any = {};
    let action = 'list';

    if (req.method === 'POST') {
      try {
        const rawBody = await req.text();
        console.log('Raw request body:', rawBody);
        
        if (rawBody) {
          requestData = JSON.parse(rawBody);
          action = requestData.action || 'create';
        }
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Invalid request format',
          details: error.message 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    console.log('Action:', action);

    // Handle create user (POST)
    if (req.method === 'POST' && action === 'create') {
      const { email, password, role } = requestData;
      
      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: 'Missing required fields: email, password, role' }), {
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

      // Assign role
      const { error: roleAssignError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user!.id,
          role
        });

      if (roleAssignError) {
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

    // Handle update user (POST with action 'update')
    if (req.method === 'POST' && action === 'update') {
      console.log('Processing update request...');
      const { userId, role, resetPassword } = requestData;
      console.log('Update request:', { userId, role, resetPassword });

      if (!userId) {
        console.log('Missing userId in request');
        return new Response(JSON.stringify({ 
          success: false,
          error: 'Missing userId' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!role && !resetPassword) {
        console.log('No role or resetPassword provided');
        return new Response(JSON.stringify({ 
          success: false,
          error: 'No role or resetPassword provided' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (role) {
        console.log(`Updating role for user ${userId} to ${role}`);
        
        // Update user role - first delete existing roles, then insert new one
        const { data: deleteData, error: deleteError } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        console.log('Delete operation result:', { deleteData, deleteError });

        if (deleteError) {
          console.error('Error deleting old roles:', deleteError);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Failed to update role',
            details: deleteError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Insert new role
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userId,
            role
          });

        console.log('Insert operation result:', { insertData, insertError });

        if (insertError) {
          console.error('Error inserting new role:', insertError);
          return new Response(JSON.stringify({ 
            success: false,
            error: 'Failed to assign new role',
            details: insertError.message 
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        console.log('Role updated successfully');
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

    // Handle list users (GET or default)
    console.log('Listing users...');
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return new Response(JSON.stringify({ error: 'Failed to fetch users' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Users fetched:', users.users.length);

    // Get roles for all users
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role');

    console.log('Roles fetched:', roles?.length || 0);

    const usersWithRoles = users.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      roles: roles?.filter(r => r.user_id === user.id).map(r => r.role) || []
    }));

    console.log('Returning users with roles:', usersWithRoles.length);

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