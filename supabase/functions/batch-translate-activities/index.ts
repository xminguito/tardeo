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

    console.log('Starting batch translation of activities...');

    // Get all activities that need translation (have Spanish but missing other languages)
    const { data: activities, error: fetchError } = await supabaseClient
      .from('activities')
      .select('id, title, description, title_es, description_es, title_en, title_ca, title_fr, title_it, title_de')
      .or('title_en.is.null,title_ca.is.null,title_fr.is.null,title_it.is.null,title_de.is.null');

    if (fetchError) {
      console.error('Error fetching activities:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${activities?.length || 0} activities to translate`);

    const results = {
      total: activities?.length || 0,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (!activities || activities.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No activities need translation',
          results 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each activity
    for (const activity of activities) {
      try {
        const titleToTranslate = activity.title_es || activity.title;
        const descriptionToTranslate = activity.description_es || activity.description;

        console.log(`Translating activity ${activity.id}: ${titleToTranslate}`);

        // Call the translate-activity function
        const { data: translations, error: translateError } = await supabaseClient.functions.invoke(
          'translate-activity',
          {
            body: {
              title: titleToTranslate,
              description: descriptionToTranslate,
            },
          }
        );

        if (translateError) {
          console.error(`Error translating activity ${activity.id}:`, translateError);
          results.failed++;
          results.errors.push(`Activity ${activity.id}: ${translateError.message}`);
          continue;
        }

        // Update the activity with translations
        const { error: updateError } = await supabaseClient
          .from('activities')
          .update({
            title_es: translations.title_es || titleToTranslate,
            title_en: translations.title_en,
            title_ca: translations.title_ca,
            title_fr: translations.title_fr,
            title_it: translations.title_it,
            title_de: translations.title_de,
            description_es: translations.description_es || descriptionToTranslate,
            description_en: translations.description_en,
            description_ca: translations.description_ca,
            description_fr: translations.description_fr,
            description_it: translations.description_it,
            description_de: translations.description_de,
          })
          .eq('id', activity.id);

        if (updateError) {
          console.error(`Error updating activity ${activity.id}:`, updateError);
          results.failed++;
          results.errors.push(`Activity ${activity.id}: ${updateError.message}`);
          continue;
        }

        console.log(`Successfully translated activity ${activity.id}`);
        results.successful++;

        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Unexpected error with activity ${activity.id}:`, error);
        results.failed++;
        results.errors.push(`Activity ${activity.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    console.error('Error in batch-translate-activities function:', error);
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
