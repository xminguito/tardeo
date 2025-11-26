import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'
import { selectTTSProvider, checkUserTTSThrottle } from '../_shared/ttsProviderSelector.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validation schema for TTS requests
const ttsSchema = z.object({
  text: z.string()
    .min(1, "Text cannot be empty")
    .max(5000, "Text too long (max 5000 characters)"),
  voice: z.string().optional(),
  bitrate: z.number().int().positive().optional(),
  provider_preference: z.enum(['elevenlabs', 'openai']).optional()
});

// Simple rate limiter: max 10 requests per IP per minute
const rateLimiter = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimiter.get(ip)
  
  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + 60000 })
    return true
  }
  
  if (record.count >= 10) {
    return false
  }
  
  record.count++
  return true
}

// Canonicalization function (copied from src/lib/utils/canonicalize.ts)
async function canonicalizeText(text: string): Promise<{ canonical: string; hash: string }> {
  let canonical = text

  canonical = canonical.trim()
  canonical = canonical
    .replace(/['']/g, "'")
    .replace(/[""]/g, '"')
  
  canonical = canonical.replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, '{{DATE}}')
  canonical = canonical.replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g, '{{DATE}}')
  
  const monthNames = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December'
  canonical = canonical.replace(
    new RegExp(`\\b(${monthNames})\\s+\\d{1,2}\\b`, 'gi'),
    '{{DATE}}'
  )
  canonical = canonical.replace(
    new RegExp(`\\b\\d{1,2}\\s+(${monthNames})\\b`, 'gi'),
    '{{DATE}}'
  )

  canonical = canonical.replace(/\b\d{1,2}:\d{2}\b/g, '{{TIME}}')
  canonical = canonical.replace(/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi, '{{TIME}}')
  canonical = canonical.replace(/\s+/g, ' ')
  canonical = canonical.replace(/([!?.])\1+/g, '$1')

  const placeholders: string[] = []
  canonical = canonical.replace(/\{\{[A-Z]+\}\}/g, (match) => {
    const index = placeholders.length
    placeholders.push(match)
    return `__PLACEHOLDER_${index}__`
  })
  
  canonical = canonical.toLowerCase()
  
  placeholders.forEach((placeholder, index) => {
    canonical = canonical.replace(`__placeholder_${index}__`, placeholder)
  })

  canonical = canonical.trim()

  const encoder = new TextEncoder()
  const data = encoder.encode(canonical)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return { canonical, hash }
}

// Sanitize input text
function sanitizeText(text: string): string {
  // Remove common debug/system logs
  let sanitized = text
    .replace(/Tool succeeded/gi, '')
    .replace(/\[DEBUG\]/gi, '')
    .replace(/\[INFO\]/gi, '')
    .replace(/\[ERROR\]/gi, '')
    .trim()
  
  return sanitized
}

// Generate audio with ElevenLabs
async function generateWithElevenLabs(
  text: string,
  voice: string = 'pNInz6obpgDQGcFmaJgB', // Default voice: Adam
  retries = 3
): Promise<ArrayBuffer> {
  const apiKey = Deno.env.get('ELEVENLABS_API_KEY')
  if (!apiKey) throw new Error('ElevenLabs API key not configured')

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`ElevenLabs attempt ${attempt}/${retries}`)
      
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5,
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`)
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error(`ElevenLabs attempt ${attempt} failed:`, error)
      if (attempt === retries) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw new Error('ElevenLabs generation failed after retries')
}

// Generate audio with OpenAI
async function generateWithOpenAI(
  text: string,
  voice: string = 'alloy',
  retries = 3
): Promise<ArrayBuffer> {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OpenAI API key not configured')

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`OpenAI attempt ${attempt}/${retries}`)
      
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voice,
          response_format: 'mp3',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenAI API error (${response.status}): ${errorText}`)
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error(`OpenAI attempt ${attempt} failed:`, error)
      if (attempt === retries) throw error
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw new Error('OpenAI generation failed after retries')
}

serve(async (req) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request
    const body = await req.json()
    const validationResult = ttsSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { text, voice, bitrate, provider_preference } = validationResult.data

    // Sanitize input
    const sanitizedText = sanitizeText(text)
    if (!sanitizedText) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: text is empty after sanitization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Processing TTS request:', { textLength: sanitizedText.length, provider_preference })

    // Canonicalize and hash
    const { canonical, hash } = await canonicalizeText(sanitizedText)
    console.log('Canonical text hash:', hash)

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user info for tracking (optional)
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch (e) {
        console.warn('Could not extract user from auth token');
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
          suggestion: 'Try using text-only mode or brief mode to reduce TTS usage',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const { data: cached, error: cacheError } = await supabase
      .from('tts_cache')
      .select('*')
      .eq('text_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cacheError) {
      console.error('Cache check error:', cacheError)
    }

    if (cached) {
      console.log('Cache hit:', hash)
      
      // Log cache hit to monitoring
      try {
        const estimatedCost = (sanitizedText.length / 1000) * 0.10; // ElevenLabs pricing
        await supabase.from('tts_monitoring_logs').insert({
          request_id: requestId,
          user_id: userId,
          text_input: sanitizedText,
          text_length: sanitizedText.length,
          provider: 'cached',
          voice_name: cached.voice_name,
          cached: true,
          cache_hit_saved_cost: estimatedCost,
          generation_time_ms: Date.now() - startTime,
          estimated_cost: 0,
          status: 'success',
        });
        console.log('[TTS Monitor] Logged cache hit:', requestId);
      } catch (logError) {
        console.error('[TTS Monitor] Failed to log cache hit:', logError);
      }
      
      return new Response(
        JSON.stringify({
          audio_url: cached.audio_url,
          provider: 'cached',
          cached: true,
          expires_at: cached.expires_at,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Cache miss, generating audio')

    // Check circuit breakers and select provider
    const providerConfig = await selectTTSProvider(supabase, provider_preference || 'elevenlabs');
    
    if (providerConfig.provider === 'disabled') {
      console.error('[TTS] Service disabled:', providerConfig.reason);
      return new Response(
        JSON.stringify({
          error: 'TTS service temporarily disabled',
          reason: providerConfig.reason,
          message: 'Audio generation is currently unavailable. Please try text-only mode.',
          text_response: sanitizedText,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use selected provider from circuit breaker
    let provider = providerConfig.provider;
    const selectedVoice = voice || providerConfig.voice;
    const selectedBitrate = bitrate || providerConfig.bitrate;
    
    if (providerConfig.reason) {
      console.log('[TTS] Provider selection reason:', providerConfig.reason);
    }

    // Determine provider availability
    const hasElevenLabs = !!Deno.env.get('ELEVENLABS_API_KEY')
    const hasOpenAI = !!Deno.env.get('OPENAI_API_KEY')

    if (!hasElevenLabs && !hasOpenAI) {
      return new Response(
        JSON.stringify({ error: 'No TTS provider configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (provider === 'elevenlabs' && !hasElevenLabs) {
      provider = 'openai'
    }
    if (provider === 'openai' && !hasOpenAI) {
      provider = 'elevenlabs'
    }

    // Default to ElevenLabs if available
    if (!provider_preference) {
      provider = hasElevenLabs ? 'elevenlabs' : 'openai'
    }

    console.log('Using provider:', provider)

    // Generate audio
    let audioBuffer: ArrayBuffer
    let contentType = 'audio/mpeg'

    if (provider === 'elevenlabs') {
      audioBuffer = await generateWithElevenLabs(sanitizedText, voice)
    } else {
      audioBuffer = await generateWithOpenAI(sanitizedText, voice)
    }

    // Upload to storage
    const timestamp = Date.now()
    const fileName = `tts/${hash}-${timestamp}.mp3`
    
    const { error: uploadError } = await supabase.storage
      .from('tts-audio')
      .upload(fileName, audioBuffer, {
        contentType,
        cacheControl: '31536000', // 1 year
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      throw new Error(`Failed to upload audio: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('tts-audio')
      .getPublicUrl(fileName)

    const audioUrl = urlData.publicUrl

    // Upsert to cache (180 days expiration)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 180)

    const { error: upsertError } = await supabase
      .from('tts_cache')
      .upsert({
        text_hash: hash,
        text: sanitizedText,
        voice_name: voice || (provider === 'elevenlabs' ? 'Adam' : 'alloy'),
        audio_url: audioUrl,
        content_type: contentType,
        bitrate: bitrate || null,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'text_hash',
      })

    if (upsertError) {
      console.error('Cache upsert error:', upsertError)
      // Don't fail the request, just log the error
    }

    console.log('TTS generation successful:', { hash, provider, audioUrl })

    // Estimate costs based on provider and text length
    const estimatedCost = provider === 'elevenlabs'
      ? (sanitizedText.length / 1000) * 0.10  // ElevenLabs: ~$0.10 per 1K chars
      : (sanitizedText.length / 1000) * 0.015; // OpenAI: ~$0.015 per 1K chars

    // Estimate audio duration (rough: ~150 words per minute)
    const wordCount = sanitizedText.split(/\s+/).length;
    const estimatedDuration = wordCount / 2.5; // 2.5 words per second

    // Log monitoring data
    try {
      await supabase.from('tts_monitoring_logs').insert({
        request_id: requestId,
        user_id: userId,
        text_input: sanitizedText,
        text_length: sanitizedText.length,
        provider: provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI',
        voice_name: voice || (provider === 'elevenlabs' ? 'Adam' : 'alloy'),
        cached: false,
        generation_time_ms: Date.now() - startTime,
        audio_duration_seconds: estimatedDuration,
        estimated_cost: estimatedCost,
        status: 'success',
      });
      console.log('[TTS Monitor] Logged generation:', requestId);
    } catch (logError) {
      console.error('[TTS Monitor] Failed to log metrics:', logError);
    }

    return new Response(
      JSON.stringify({
        audio_url: audioUrl,
        provider,
        cached: false,
        expires_at: expiresAt.toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('TTS function error:', error)
    
    // Log error to monitoring
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase.from('tts_monitoring_logs').insert({
        request_id: requestId,
        text_input: '',
        text_length: 0,
        provider: 'unknown',
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        generation_time_ms: Date.now() - startTime,
      });
    } catch (logError) {
      console.error('[TTS Monitor] Failed to log error:', logError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
