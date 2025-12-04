// translate-activity - Native Supabase Edge Function
// Translates activity title and description to 5 languages using OpenAI
// NO Lovable dependencies - 100% native implementation

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

    console.log('Translating activity:', { title, description: description?.slice(0, 50) });

    // System prompt for consistent translations
    const systemPrompt = `You are a professional translator specializing in event and activity content.
Your task is to translate Spanish text into English, Catalan, French, Italian, and German.

Rules:
- Maintain the friendly and engaging tone of the original
- Keep the same meaning, style, and any emojis
- Preserve formatting and punctuation style
- Return ONLY a valid JSON object, no markdown code blocks
- If description is empty or "No description provided", translate that phrase appropriately`;

    // User prompt with the content to translate
    const userPrompt = `Translate this Spanish activity content to 5 languages.

Original Spanish:
Title: ${title}
Description: ${description || 'No description provided'}

Return this exact JSON structure:
{
  "title_en": "English title",
  "title_ca": "Catalan title", 
  "title_fr": "French title",
  "title_it": "Italian title",
  "title_de": "German title",
  "description_en": "English description",
  "description_ca": "Catalan description",
  "description_fr": "French description",
  "description_it": "Italian description",
  "description_de": "German description"
}`;

    // Call OpenAI API directly (no Lovable gateway)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      }),
    });

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
      throw new Error('No translation received from OpenAI');
    }

    console.log('Raw AI response received, parsing...');

    // Parse the JSON response
    let translations: Translations;
    try {
      // Clean up any potential markdown formatting
      const cleanedText = translatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      translations = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', translatedText);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate the response has all required fields
    const requiredFields: (keyof Translations)[] = [
      'title_en', 'title_ca', 'title_fr', 'title_it', 'title_de',
      'description_en', 'description_ca', 'description_fr', 'description_it', 'description_de'
    ];

    for (const field of requiredFields) {
      if (!translations[field]) {
        console.error('Missing field in translation:', field);
        throw new Error(`Missing translation field: ${field}`);
      }
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
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
