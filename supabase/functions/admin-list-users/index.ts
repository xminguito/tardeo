/**
 * Admin List Users Edge Function
 * 
 * Purpose: Securely list all users with their profiles and roles
 * Only accessible by admin users
 * 
 * Required Env Vars:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (auto-provided)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/**
 * Check if user is admin
 */
async function isAdmin(userId: string): Promise<boolean> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();

  if (error) {
    console.error('[admin-list-users] Error checking admin role:', error);
    return false;
  }

  return !!data;
}

/**
 * Main handler
 */
serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
      },
    });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Extract JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify Supabase JWT using service role client
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const {
      data: { user },
      error: authError,
    } = await serviceClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message || 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(user.id);
    if (!userIsAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // List all users using admin API
    const { data: authUsers, error: listError } = await serviceClient.auth.admin.listUsers();

    if (listError) {
      console.error('[admin-list-users] Error listing users:', listError);
      return new Response(
        JSON.stringify({ error: 'Failed to list users', details: listError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get user roles
    const { data: roles } = await serviceClient
      .from('user_roles')
      .select('user_id, role');

    const rolesMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

    // Get profiles
    const { data: profiles } = await serviceClient
      .from('profiles')
      .select('id, full_name');

    const profilesMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

    // Transform and combine data
    const users = authUsers.users.map(authUser => ({
      id: authUser.id,
      email: authUser.email || 'No email',
      full_name: profilesMap.get(authUser.id) || authUser.user_metadata?.full_name,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
      role: rolesMap.get(authUser.id),
      email_confirmed_at: authUser.email_confirmed_at,
      banned_until: authUser.banned_until,
    }));

    return new Response(
      JSON.stringify({ users }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[admin-list-users] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

