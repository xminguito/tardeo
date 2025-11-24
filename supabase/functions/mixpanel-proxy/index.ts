/**
 * Mixpanel Proxy Edge Function
 * 
 * Purpose: Securely forward sensitive analytics events to Mixpanel
 * without exposing API secrets to the client.
 * 
 * Flow:
 * 1. Validate authentication (Supabase JWT)
 * 2. Sanitize and hash user identifiers
 * 3. Insert event into recent_events table
 * 4. Forward event to Mixpanel API
 * 
 * Required Env Vars:
 * - MIXPANEL_API_SECRET: Mixpanel project API secret
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (auto-provided)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const MIXPANEL_API_SECRET = Deno.env.get('MIXPANEL_API_SECRET');
const MIXPANEL_API_HOST = 'https://api-eu.mixpanel.com'; // EU data residency
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ProxyRequestBody {
  event: string;
  properties?: Record<string, any>;
  user_id?: string;
}

/**
 * SHA-256 hash helper
 */
async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Forward event to Mixpanel
 */
async function forwardToMixpanel(
  event: string,
  properties: Record<string, any>
): Promise<void> {
  if (!MIXPANEL_API_SECRET) {
    console.warn('[mixpanel-proxy] MIXPANEL_API_SECRET not configured, skipping forward');
    return;
  }

  // Mixpanel /track endpoint expects base64-encoded JSON
  const payload = [
    {
      event,
      properties: {
        time: Math.floor(Date.now() / 1000),
        ...properties,
      },
    },
  ];

  const base64Data = btoa(JSON.stringify(payload));

  const response = await fetch(`${MIXPANEL_API_HOST}/track`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/plain',
    },
    body: `data=${encodeURIComponent(base64Data)}&ip=0&verbose=1`,
  });

  const responseText = await response.text();
  
  if (!response.ok || responseText !== '1') {
    console.error('[mixpanel-proxy] Mixpanel forward failed:', responseText);
    throw new Error(`Mixpanel API error: ${responseText}`);
  }

  console.log('[mixpanel-proxy] Successfully forwarded to Mixpanel:', event);
}

/**
 * Insert event into recent_events table
 */
async function insertRecentEvent(
  eventName: string,
  userIdText: string | null,
  properties: Record<string, any>
): Promise<void> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { error } = await supabase.from('recent_events').insert({
    event_name: eventName,
    user_id_text: userIdText,
    properties,
  });

  if (error) {
    console.error('[mixpanel-proxy] Failed to insert recent_event:', error);
    throw new Error(`DB insert failed: ${error.message}`);
  }

  console.log('[mixpanel-proxy] Inserted into recent_events:', eventName);
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
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

    // Parse request body
    const body: ProxyRequestBody = await req.json();
    const { event, properties = {}, user_id } = body;

    if (!event || typeof event !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid event name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize user ID: hash with SHA-256 and truncate
    const userIdText = user_id
      ? (await sha256(String(user_id))).slice(0, 32)
      : null;

    // Insert into recent_events (async, don't block on errors)
    insertRecentEvent(event, userIdText, properties).catch((err) => {
      console.error('[mixpanel-proxy] Insert error (non-blocking):', err);
    });

    // Forward to Mixpanel (non-blocking - don't fail if Mixpanel is down)
    forwardToMixpanel(event, properties).catch((err) => {
      console.error('[mixpanel-proxy] Mixpanel forward error (non-blocking):', err);
    });

    return new Response(
      JSON.stringify({ ok: true, event }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[mixpanel-proxy] Error:', error);
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
