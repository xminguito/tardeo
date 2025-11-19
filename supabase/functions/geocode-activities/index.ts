import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function geocodeLocation(locationString: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1&accept-language=es`,
      {
        headers: {
          'User-Agent': 'Tardeo-App/1.0',
        },
      }
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Get all activities without coordinates
    const { data: activities, error: fetchError } = await supabaseClient
      .from('activities')
      .select('id, city, location, latitude, longitude')
      .or('latitude.is.null,longitude.is.null');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`Found ${activities?.length || 0} activities to geocode`);

    let updated = 0;
    let failed = 0;

    // Geocode each activity
    for (const activity of activities || []) {
      const locationString = activity.city || activity.location;
      
      console.log(`Geocoding: ${locationString}`);
      
      const coords = await geocodeLocation(locationString);
      
      if (coords) {
        const { error: updateError } = await supabaseClient
          .from('activities')
          .update({
            latitude: coords.lat,
            longitude: coords.lng,
          })
          .eq('id', activity.id);

        if (updateError) {
          console.error(`Failed to update activity ${activity.id}:`, updateError);
          failed++;
        } else {
          console.log(`✓ Updated ${locationString}: ${coords.lat}, ${coords.lng}`);
          updated++;
        }
      } else {
        console.warn(`✗ Could not geocode: ${locationString}`);
        failed++;
      }

      // Rate limiting: wait 1 second between requests to respect Nominatim's usage policy
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: activities?.length || 0,
        updated,
        failed,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
