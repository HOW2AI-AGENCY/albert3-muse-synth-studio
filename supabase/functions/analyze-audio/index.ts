import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function mainHandler(req: Request): Promise<Response> {
  const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');

  if (!MUREKA_API_KEY) {
    logger.error('[analyze-audio] MUREKA_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'MUREKA_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { audioUrl, fullDescription } = await req.json();
  
  logger.info('[analyze-audio] Request received', {
    audioUrlPreview: audioUrl?.substring(0, 50),
    fullDescription: !!fullDescription
  });

  if (!audioUrl) {
    return new Response(
      JSON.stringify({ error: 'audioUrl is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    logger.info('[analyze-audio] Downloading audio from storage');

    // Download audio from Supabase storage
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }

    const audioBlob = await audioResponse.blob();
    logger.info('[analyze-audio] Audio downloaded', { sizeBytes: audioBlob.size });

    // Upload to Mureka
    const formData = new FormData();
    formData.append('file', audioBlob, 'reference.mp3');

    logger.info('[analyze-audio] Uploading to Mureka API');
    const uploadResponse = await fetch('https://api.mureka.ai/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('[analyze-audio] Mureka upload failed', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorPreview: errorText.substring(0, 200)
      });
      throw new Error(`Mureka upload failed: ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.data?.file_id;

    if (!fileId) {
      throw new Error('No file_id returned from Mureka');
    }

    logger.info('[analyze-audio] File uploaded to Mureka', { fileId });

    // Analyze using Mureka Song Description API
    logger.info('[analyze-audio] Requesting song description from Mureka');
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
      logger.error('[analyze-audio] Mureka describe failed', {
        status: descriptionResponse.status,
        statusText: descriptionResponse.statusText,
        errorPreview: errorText.substring(0, 200)
      });
      throw new Error(`Mureka describe failed: ${descriptionResponse.statusText}`);
    }

    const descriptionData = await descriptionResponse.json();
    const description = descriptionData.data?.description;

    if (!description) {
      logger.warn('[analyze-audio] No description returned from Mureka');
      return new Response(
        JSON.stringify({ duration: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('[analyze-audio] Analysis complete', {
      hasGenre: !!description.genre,
      hasTempo: !!description.tempo_bpm,
      hasKey: !!description.key,
      hasMood: !!description.mood,
      duration: description.duration
    });

    // If fullDescription requested, generate detailed text description
    if (fullDescription) {
      const fullDesc = [
        description.genre ? `Genre: ${description.genre}` : '',
        description.tempo_bpm ? `Tempo: ${description.tempo_bpm} BPM` : '',
        description.key ? `Key: ${description.key}` : '',
        description.energy_level ? `Energy: ${description.energy_level}` : '',
        description.mood ? `Mood: ${description.mood}` : '',
      ].filter(Boolean).join(', ');

      logger.info('[analyze-audio] Full description generated', {
        descriptionLength: fullDesc.length,
        fullDescriptionRequested: true
      });

      return new Response(
        JSON.stringify({
          duration: description.duration || 0,
          bpm: description.tempo_bpm,
          key: description.key,
          genre: description.genre,
          energy: description.energy_level,
          fullDescription: fullDesc || 'Music track with various characteristics',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return structured analysis (original behavior)
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
    logger.error('[analyze-audio] Fatal error', {
      error: error instanceof Error ? error.message : String(error)
    });
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
