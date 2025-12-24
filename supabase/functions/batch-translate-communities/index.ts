// batch-translate-communities - Supabase Edge Function
// Translates all communities that are missing translations
// Architecture mirrors batch-translate-activities

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting batch translation of communities...');

    // Get all communities that need translation (translations is null or empty)
    const { data: communities, error: fetchError } = await supabaseClient
      .from('communities')
      .select('id, name, description, translations')
      .or('translations.is.null,translations.eq.{}');

    if (fetchError) {
      console.error('Error fetching communities:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${communities?.length || 0} communities to translate`);

    const results = {
      total: communities?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!communities || communities.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No communities need translation',
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each community
    for (const community of communities) {
      try {
        console.log(`Translating community ${community.id}: ${community.name}`);

        // Call the translate-community function
        const { data: result, error: translateError } = await supabaseClient.functions.invoke(
          'translate-community',
          {
            body: {
              communityId: community.id,
            },
          }
        );

        if (translateError) {
          console.error(`Error translating community ${community.id}:`, translateError);
          results.failed++;
          results.errors.push(`Community ${community.id} (${community.name}): ${translateError.message}`);
          continue;
        }

        if (result?.error) {
          console.error(`Translation error for community ${community.id}:`, result.error);
          results.failed++;
          results.errors.push(`Community ${community.id} (${community.name}): ${result.error}`);
          continue;
        }

        console.log(`Successfully translated community ${community.id}`);
        results.successful++;

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Unexpected error with community ${community.id}:`, error);
        results.failed++;
        results.errors.push(`Community ${community.id} (${community.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('Batch translation completed:', results);

    return new Response(
      JSON.stringify({
        message: 'Batch translation completed',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in batch-translate-communities function:', error);
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

