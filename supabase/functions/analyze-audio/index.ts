import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function mainHandler(req: Request): Promise<Response> {
  const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');

  if (!MUREKA_API_KEY) {
    console.error('[analyze-audio] MUREKA_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'MUREKA_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { audioUrl } = await req.json();

  if (!audioUrl) {
    return new Response(
      JSON.stringify({ error: 'audioUrl is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('[analyze-audio] Downloading audio:', audioUrl.substring(0, 50));

    // Download audio from Supabase storage
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    console.log('[analyze-audio] Audio downloaded, size:', audioBlob.size);

    // Upload to Mureka
    const formData = new FormData();
    formData.append('file', audioBlob, 'reference.mp3');

    console.log('[analyze-audio] Uploading to Mureka...');
    const uploadResponse = await fetch('https://api.mureka.ai/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[analyze-audio] Mureka upload failed:', errorText);
      throw new Error(`Mureka upload failed: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.data?.file_id;

    if (!fileId) {
      throw new Error('No file_id returned from Mureka');
    }

    console.log('[analyze-audio] File uploaded to Mureka, file_id:', fileId);

    // Analyze using Mureka Song Description API
    console.log('[analyze-audio] Requesting song description...');
    const descriptionResponse = await fetch('https://api.mureka.ai/v1/song/describe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio_file: fileId }),
    });

    if (!descriptionResponse.ok) {
      const errorText = await descriptionResponse.text();
      console.error('[analyze-audio] Mureka describe failed:', errorText);
      throw new Error(`Mureka describe failed: ${descriptionResponse.statusText}`);
    }

    const descriptionData = await descriptionResponse.json();
    const description = descriptionData.data?.description;

    if (!description) {
      console.warn('[analyze-audio] No description returned, returning basic info');
      return new Response(
        JSON.stringify({ duration: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[analyze-audio] Analysis complete:', description);

    // Return structured analysis
    return new Response(
      JSON.stringify({
        duration: description.duration || 0,
        bpm: description.tempo_bpm,
        key: description.key,
        genre: description.genre,
        energy: description.energy_level,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[analyze-audio] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  return mainHandler(req);
});
