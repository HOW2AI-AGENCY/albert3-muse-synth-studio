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
    logger.info('[analyze-audio] Downloading audio from URL');

    // ✅ FIX: Add proper error handling for audio download
    let audioBlob: Blob;
    try {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      audioBlob = await audioResponse.blob();
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Downloaded audio file is empty');
      }
      
      logger.info('[analyze-audio] Audio downloaded', { sizeBytes: audioBlob.size });
    } catch (downloadError) {
      logger.error('[analyze-audio] Audio download failed', {
        error: downloadError instanceof Error ? downloadError.message : String(downloadError),
        audioUrl: audioUrl.substring(0, 100)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download audio file. Please check if the URL is accessible.',
          details: downloadError instanceof Error ? downloadError.message : 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Mureka
    const formData = new FormData();
    const contentType = (audioBlob as any).type || 'application/octet-stream';
    const ext = contentType.includes('mpeg') ? 'mp3'
      : contentType.includes('wav') ? 'wav'
      : contentType.includes('ogg') ? 'ogg'
      : contentType.includes('flac') ? 'flac'
      : contentType.includes('aac') ? 'aac'
      : contentType.includes('m4a') ? 'm4a'
      : 'bin';
    const normalized = new Blob([audioBlob], { type: contentType });
    formData.append('file', normalized, `reference.${ext}`);
    // REQUIRED by Mureka API
    formData.append('purpose', 'audio');

    logger.info('[analyze-audio] Uploading to Mureka API');
    
    let uploadResponse: Response;
    try {
      uploadResponse = await fetch('https://api.mureka.ai/v1/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MUREKA_API_KEY}`,
        },
        body: formData,
      });
    } catch (uploadError) {
      logger.error('[analyze-audio] Mureka upload network error', {
        error: uploadError instanceof Error ? uploadError.message : String(uploadError)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to connect to Mureka API',
          details: uploadError instanceof Error ? uploadError.message : 'Network error'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      logger.error('[analyze-audio] Mureka upload failed', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        errorPreview: errorText.substring(0, 200)
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Mureka upload failed: ${uploadResponse.statusText}`,
          details: errorText.substring(0, 200),
          status: uploadResponse.status
        }),
        { status: uploadResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uploadData = await uploadResponse.json();
    // Support both flat and wrapped response shapes
    const fileId = uploadData.data?.file_id ?? uploadData.id;
    const fileSize = uploadData.data?.file_size ?? uploadData.bytes;

    if (!fileId) {
      logger.error('[analyze-audio] No file_id in response', { uploadData });
      throw new Error('No file_id returned from Mureka');
    }

    logger.info('[analyze-audio] File uploaded to Mureka', { fileId, fileSize });

    // Analyze using Mureka Song Description API
    // ✅ FIX: Mureka describe endpoint требует "url", а не "audio_file"
    logger.info('[analyze-audio] Requesting song description from Mureka');
    const descriptionResponse = await fetch('https://api.mureka.ai/v1/song/describe', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MUREKA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: audioUrl }),
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
