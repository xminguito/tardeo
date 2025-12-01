import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { checkUserTTSThrottle } from '../_shared/ttsProviderSelector.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to detect emotional context and adjust voice parameters
function analyzeEmotionalContext(text: string): { speed: number; style?: string } {
  const lowerText = text.toLowerCase()
  
  // Base configuration
  let speed = 0.9
  
  // Alegría / felicitaciones - tono más cálido, velocidad ligeramente más rápida
  const joyKeywords = ['perfecto', 'genial', 'estupendo', 'maravilloso', 'encanta', 'fantástico', '😊', '¡']
  if (joyKeywords.some(keyword => lowerText.includes(keyword))) {
    speed = 0.95 // +0.05
    console.log('Detected joy context, adjusting speed to', speed)
  }
  
  // Urgencia / aviso importante - tono firme, velocidad más rápida
  const urgencyKeywords = ['atención', 'urgente', 'importante', 'empieza en', 'termina en', 'aviso']
  if (urgencyKeywords.some(keyword => lowerText.includes(keyword))) {
    speed = 1.0 // +0.1
    console.log('Detected urgency context, adjusting speed to', speed)
  }
  
  // Sorpresa - tono más elevado y expresivo
  const surpriseKeywords = ['sorpresa', '¡qué', 'increíble', 'wow', '¿qué']
  if (surpriseKeywords.some(keyword => lowerText.includes(keyword))) {
    speed = 0.95 // +0.05
    console.log('Detected surprise context, adjusting speed to', speed)
  }
  
  // Calma / información - ritmo más relajado
  const calmKeywords = ['hola', 'tienes', 'actividades', 'hoy', 'cerca']
  if (calmKeywords.some(keyword => lowerText.includes(keyword)) && 
      !urgencyKeywords.some(keyword => lowerText.includes(keyword))) {
    speed = 0.85 // -0.05
    console.log('Detected calm/informative context, adjusting speed to', speed)
  }
  
  return { speed }
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  let logData: any = {
    request_id: requestId,
    status: 'success',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = await req.json()

    if (!text) {
      throw new Error('Text is required')
    }

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user info for tracking (optional)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.warn('Could not extract user from auth token:', e);
      }
    }

    // Check per-user throttling
    const throttleCheck = await checkUserTTSThrottle(supabase, userId);
    if (!throttleCheck.allowed) {
      console.warn(`[TTS] User ${userId} throttled:`, throttleCheck.reason);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: throttleCheck.reason,
          retry_after: 60,
          current_minute: throttleCheck.current_minute,
          current_day: throttleCheck.current_day,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logData = {
      ...logData,
      user_id: userId,
      text_input: text,
      text_length: text.length,
      provider: 'OpenAI',
      voice_name: 'shimmer',
      mode: 'full', // Could be extracted from request if you pass it
    };

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured')
    }

    console.log('Generating speech for text:', text.substring(0, 50) + '...')

    // Analyze emotional context and adjust parameters
    const { speed } = analyzeEmotionalContext(text)

    // CRITICAL: Always use shimmer voice (Spanish female voice)
    // This is explicitly set and NOT dependent on any cache or session
    const voiceConfig = {
      model: 'gpt-4o-mini-tts',
      input: text,
      voice: 'shimmer', // FIXED: Always shimmer - Clear feminine Spanish voice
      response_format: 'mp3',
      speed: speed, // Dynamic based on emotional analysis
    }

    console.log('Voice configuration:', JSON.stringify({ voice: voiceConfig.voice, speed: voiceConfig.speed, model: voiceConfig.model }))

    // Generate speech from text using OpenAI TTS
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(voiceConfig),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('OpenAI TTS error:', error)
      throw new Error(error.error?.message || 'Failed to generate speech')
    }

    // Convert audio buffer to base64 in chunks to avoid stack overflow
    const arrayBuffer = await response.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize)
      binary += String.fromCharCode.apply(null, Array.from(chunk))
    }
    
    const base64Audio = btoa(binary)

    console.log('Speech generated successfully')

    const generationTime = Date.now() - startTime;

    // Estimate audio duration (rough: ~150 words per minute = 2.5 words per second)
    const wordCount = text.split(/\s+/).length;
    const estimatedDuration = wordCount / 2.5;

    // Estimate cost (OpenAI TTS: ~$0.015 per 1K characters)
    const estimatedCost = (text.length / 1000) * 0.015;

    // Log monitoring data
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase.from('tts_monitoring_logs').insert({
        ...logData,
        generation_time_ms: generationTime,
        audio_duration_seconds: estimatedDuration,
        estimated_cost: estimatedCost,
        cached: false, // This endpoint doesn't use cache
      });

      console.log('[TTS Monitor] Logged request:', requestId);
    } catch (logError) {
      console.error('[TTS Monitor] Failed to log metrics:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({ audioContent: base64Audio }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      },
    )
  } catch (error) {
    console.error('Error in text-to-speech function:', error)

    // Log error to monitoring
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      await supabase.from('tts_monitoring_logs').insert({
        ...logData,
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        generation_time_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error('[TTS Monitor] Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
