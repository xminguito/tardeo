import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY')
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY is not configured')
    }

    const AGENT_ID = 'agent_7001k88cx9jjf818atpezdyp2z3y'

    console.log('Requesting signed URL for agent:', AGENT_ID)

    // Request signed URL from ElevenLabs
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${AGENT_ID}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('ElevenLabs API error:', error)
      throw new Error(error.detail?.message || 'Failed to get signed URL')
    }

    const data = await response.json()
    console.log('Signed URL obtained successfully')

    return new Response(
      JSON.stringify({ signedUrl: data.signed_url }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        },
      },
    )
  } catch (error) {
    console.error('Error in elevenlabs-signed-url function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
