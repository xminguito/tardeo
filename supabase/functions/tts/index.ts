import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Parse request
    const { text, voice, bitrate, provider_preference } = await req.json()

    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input: text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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

    // Determine provider
    let provider = provider_preference || 'elevenlabs'
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
