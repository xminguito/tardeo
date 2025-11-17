import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Translating activity:', { title, description });

    // Create the prompt for translation
    const prompt = `Translate the following activity title and description to English, Catalan, French, Italian, and German.
Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just the raw JSON):
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
}

Original Spanish content:
Title: ${title}
Description: ${description || 'No description provided'}

Important: 
- Keep the tone friendly and engaging
- Maintain the same meaning and style
- Return ONLY the JSON object, nothing else`;

    // Call Lovable AI
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content;

    if (!translatedText) {
      throw new Error('No translation received from AI');
    }

    console.log('Raw AI response:', translatedText);

    // Parse the JSON response
    let translations;
    try {
      // Remove markdown code blocks if present
      const cleanedText = translatedText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      translations = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', translatedText);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response has all required fields
    const requiredFields = [
      'title_en', 'title_ca', 'title_fr', 'title_it', 'title_de',
      'description_en', 'description_ca', 'description_fr', 'description_it', 'description_de'
    ];

    for (const field of requiredFields) {
      if (!translations[field]) {
        console.error('Missing field in translation:', field);
        throw new Error(`Missing translation field: ${field}`);
      }
    }

    console.log('Successfully translated activity');

    return new Response(
      JSON.stringify(translations),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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