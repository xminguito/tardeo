// translate-activity - Supabase Edge Function
// Translates activity title and description to 5 languages using OpenAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TranslateRequest {
  title: string;
  description?: string;
}

interface Translations {
  title_en: string;
  title_ca: string;
  title_fr: string;
  title_it: string;
  title_de: string;
  description_en: string;
  description_ca: string;
  description_fr: string;
  description_it: string;
  description_de: string;
}

// Timeout for OpenAI API calls (45 seconds for longer texts)
const OPENAI_TIMEOUT_MS = 45000;
// Max retries
const MAX_RETRIES = 1;

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  retryCount = 0
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`OpenAI request timed out (attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
      
      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying OpenAI request...`);
        return callOpenAI(apiKey, systemPrompt, userPrompt, maxTokens, retryCount + 1);
      }
      
      throw new Error('Translation request timed out. Please try again.');
    }
    
    throw error;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  try {
    const { title, description }: TranslateRequest = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!title || title.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Title is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate description to prevent extremely long translations
    // But allow enough for a good activity description
    const maxDescLength = 800;
    const truncatedDescription = description 
      ? description.slice(0, maxDescLength) + (description.length > maxDescLength ? '...' : '')
      : '';

    const descLength = truncatedDescription.length;
    
    // Calculate max tokens based on content length
    // Each language needs roughly the same characters, plus JSON structure
    // Approximate: (title + description) * 5 languages * 1.5 (for other languages being longer) + 500 for JSON
    const estimatedTokens = Math.min(4000, Math.max(1500, Math.ceil((title.length + descLength) * 5 * 1.5 / 4) + 500));

    console.log('Translating activity:', { 
      title, 
      descriptionLength: description?.length || 0,
      truncatedLength: descLength,
      estimatedTokens
    });

    // Simplified prompt for better JSON output
    const systemPrompt = `Translate Spanish to EN, CA, FR, IT, DE. Output valid JSON only. Keep emojis.`;

    const userPrompt = truncatedDescription 
      ? `{"title":"${title.replace(/"/g, '\\"')}","desc":"${truncatedDescription.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}`
      : `{"title":"${title.replace(/"/g, '\\"')}"}`;

    const fullPrompt = `Translate this Spanish content to 5 languages. Return JSON with keys: title_en, title_ca, title_fr, title_it, title_de${truncatedDescription ? ', description_en, description_ca, description_fr, description_it, description_de' : ''}

Input: ${userPrompt}`;

    console.log('Calling OpenAI API with', estimatedTokens, 'max tokens...');
    const startTime = Date.now();

    const response = await callOpenAI(OPENAI_API_KEY, systemPrompt, fullPrompt, estimatedTokens);

    console.log(`OpenAI responded in ${Date.now() - startTime}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402 || response.status === 403) {
        return new Response(
          JSON.stringify({ error: 'OpenAI API access issue. Check your API key and billing.' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content;

    if (!translatedText) {
      console.error('No content in OpenAI response:', JSON.stringify(data));
      throw new Error('No translation received from OpenAI');
    }

    console.log('Parsing AI response, length:', translatedText.length);

    // Parse the JSON response
    let translations: Translations;
    try {
      const cleanedText = translatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      translations = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response. Raw text:', translatedText.slice(0, 500));
      throw new Error('Invalid JSON response from OpenAI. The text may be too long.');
    }

    // Validate required title fields
    const titleFields: (keyof Translations)[] = ['title_en', 'title_ca', 'title_fr', 'title_it', 'title_de'];
    for (const field of titleFields) {
      if (!translations[field]) {
        console.error('Missing field in translation:', field);
        throw new Error(`Missing translation field: ${field}`);
      }
    }

    // For descriptions, provide empty string fallback if not present
    if (truncatedDescription) {
      const descFields: (keyof Translations)[] = ['description_en', 'description_ca', 'description_fr', 'description_it', 'description_de'];
      for (const field of descFields) {
        if (!translations[field]) {
          translations[field] = '';
        }
      }
    } else {
      // No description provided, set empty strings
      translations.description_en = '';
      translations.description_ca = '';
      translations.description_fr = '';
      translations.description_it = '';
      translations.description_de = '';
    }

    console.log('Successfully translated activity to 5 languages');

    return new Response(
      JSON.stringify(translations),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in translate-activity function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isTimeout = errorMessage.includes('timed out');
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: isTimeout ? 504 : 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
