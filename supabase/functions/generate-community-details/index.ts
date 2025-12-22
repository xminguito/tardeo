// generate-community-details - Supabase Edge Function
// Generates AI-powered community details (name, description, category) using OpenAI

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface GenerateCommunityDetailsRequest {
  topic: string;
  language?: string; // 'es' or 'en'
}

interface GenerateCommunityDetailsResponse {
  name: string;
  description: string;
  category: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const AVAILABLE_CATEGORIES = [
  'sports',
  'art',
  'social',
  'learning',
  'wellness',
  'food',
  'tech',
  'travel',
  'other',
];

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    
    if (!OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const body: GenerateCommunityDetailsRequest = await req.json();
    const { topic, language = 'es' } = body;

    if (!topic || topic.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Generating community details for:', { topic, language });

    // Build the system prompt based on language
    const systemPrompt = language === 'en' 
      ? `You are an expert community manager and copywriter.
Your task is to generate details for a new community based on a user's topic/idea.

Rules:
- Generate a catchy, friendly community name (max 50 chars)
- Write a compelling description that motivates people to join (max 200 chars)
- Pick the BEST category from this list: ${AVAILABLE_CATEGORIES.join(', ')}
- Use an enthusiastic, welcoming tone
- Focus on what makes the community special and what members will experience
- NO hashtags, NO prices, NO dates

YOU MUST respond in valid JSON format:
{
  "name": "Community Name",
  "description": "Brief description that excites people to join",
  "category": "one of the available categories"
}

Respond ONLY with the JSON, no additional text.`
      : `Eres un experto community manager y copywriter.
Tu tarea es generar detalles para una nueva comunidad basándote en el tema/idea del usuario.

Reglas:
- Genera un nombre atractivo y cercano para la comunidad (máx 50 caracteres)
- Escribe una descripción convincente que motive a unirse (máx 200 caracteres)
- Elige la MEJOR categoría de esta lista: ${AVAILABLE_CATEGORIES.join(', ')}
- Usa un tono entusiasta y acogedor
- Enfócate en lo que hace especial a la comunidad y qué experimentarán los miembros
- SIN hashtags, SIN precios, SIN fechas

DEBES responder en formato JSON válido:
{
  "name": "Nombre de la Comunidad",
  "description": "Descripción breve que emocione a las personas a unirse",
  "category": "una de las categorías disponibles"
}

Responde SOLO con el JSON, sin texto adicional.`;

    // Call OpenAI API directly
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Topic/Idea: "${topic}"`
          }
        ],
        temperature: 0.8,
        max_tokens: 250,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content?.trim();

    if (!generatedContent) {
      throw new Error('No content generated from OpenAI');
    }

    // Parse the JSON response
    let parsedDetails;
    try {
      parsedDetails = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response structure
    if (!parsedDetails.name || !parsedDetails.description || !parsedDetails.category) {
      throw new Error('Incomplete response from AI');
    }

    // Validate category
    if (!AVAILABLE_CATEGORIES.includes(parsedDetails.category)) {
      parsedDetails.category = 'other';
    }

    console.log('Generated community details:', parsedDetails);

    const result: GenerateCommunityDetailsResponse = {
      name: parsedDetails.name,
      description: parsedDetails.description,
      category: parsedDetails.category,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens,
        completion_tokens: data.usage?.completion_tokens,
        total_tokens: data.usage?.total_tokens,
      }
    };

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in generate-community-details function:', error);
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
