/**
 * Mixpanel Proxy - Supabase Edge Function
 * 
 * Server-side tracking for sensitive events using API secret.
 * Does NOT expose the Mixpanel token to the client.
 * 
 * Usage:
 * POST /functions/v1/mixpanel-proxy
 * Body: { event: string, properties: Record<string, any> }
 * 
 * Required env var: MIXPANEL_API_SECRET
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MixpanelEvent {
  event: string;
  properties: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Mixpanel API secret from env
    const MIXPANEL_API_SECRET = Deno.env.get('MIXPANEL_API_SECRET');
    
    if (!MIXPANEL_API_SECRET) {
      console.error('[Mixpanel Proxy] MIXPANEL_API_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Analytics not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body: MixpanelEvent = await req.json();
    
    if (!body.event) {
      return new Response(
        JSON.stringify({ error: 'Missing event name' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[Mixpanel Proxy] Tracking server-side event: ${body.event}`);

    // Enrich properties with server-side metadata
    const enrichedProperties = {
      ...body.properties,
      source: 'server',
      timestamp: new Date().toISOString(),
      // Add server-specific metadata
      server_env: Deno.env.get('DENO_ENV') || 'production',
    };

    // Send to Mixpanel API
    // Using /track endpoint with secret token
    const mixpanelPayload = [{
      event: body.event,
      properties: {
        ...enrichedProperties,
        token: MIXPANEL_API_SECRET,
        time: Math.floor(Date.now() / 1000), // Unix timestamp
      },
    }];

    const mixpanelResponse = await fetch('https://api.mixpanel.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/plain',
      },
      body: JSON.stringify(mixpanelPayload),
    });

    if (!mixpanelResponse.ok) {
      const errorText = await mixpanelResponse.text();
      console.error('[Mixpanel Proxy] API error:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to track event',
          details: errorText,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await mixpanelResponse.text();
    console.log(`[Mixpanel Proxy] Success: ${result}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        event: body.event,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Mixpanel Proxy] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


