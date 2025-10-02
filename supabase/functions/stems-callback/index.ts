import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PAYLOAD_SIZE = 5 * 1024 * 1024; // 5MB

function sanitizeText(text: string, maxLength: number): string {
  if (!text) return '';
  const cleaned = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  return cleaned.substring(0, maxLength);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Payload too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const bodyText = await req.text();
    if (bodyText.length > MAX_PAYLOAD_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Payload too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.parse(bodyText);
    console.log('Stems callback payload:', JSON.stringify(payload, null, 2));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (payload.code !== 200 || !payload.data) {
      console.error('Invalid stems callback payload:', payload);
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data } = payload;
    const stemTaskId = data.task_id || data.taskId;

    if (!stemTaskId) {
      console.error('Missing task ID in stems callback');
      return new Response(
        JSON.stringify({ error: 'Missing task ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find track by stem_task_id
    const { data: trackRecord, error: trackError } = await supabase
      .from('tracks')
      .select('id, metadata')
      .eq('metadata->stem_task_id', stemTaskId)
      .maybeSingle();

    if (trackError || !trackRecord) {
      console.error('Stems callback: error finding track:', trackError);
      throw trackError || new Error('Track not found');
    }

    const trackId = trackRecord.id;
    const separationMode = trackRecord.metadata?.stem_separation_mode || 'separate_vocal';

    // Get version ID if stems were generated for specific version
    const { data: versionRecord } = await supabase
      .from('track_versions')
      .select('id')
      .eq('parent_track_id', trackId)
      .eq('metadata->stem_task_id', stemTaskId)
      .maybeSingle();

    const versionId = versionRecord?.id || null;

    // Process stems data
    const stems = data.data || [];
    
    // Map stem types from Suno response
    const stemTypeMap: { [key: string]: string } = {
      'vocal': 'vocals',
      'vocals': 'vocals',
      'instrument': 'instrumental',
      'instrumental': 'instrumental',
      'drums': 'drums',
      'bass': 'bass',
      'guitar': 'guitar',
      'keyboard': 'keyboard',
      'strings': 'strings',
      'brass': 'brass',
      'woodwinds': 'woodwinds',
      'percussion': 'percussion',
      'synth': 'synth',
      'fx': 'fx',
      'other': 'fx'
    };

    for (const stem of stems) {
      const stemType = stemTypeMap[stem.type?.toLowerCase() || ''] || 'fx';
      const audioUrl = stem.audio_url || stem.url || '';

      if (!audioUrl) {
        console.log('Skipping stem without audio URL:', stem);
        continue;
      }

      console.log('Processing stem:', { stemType, audioUrl: audioUrl.substring(0, 50) });

      const { error: stemError } = await supabase
        .from('track_stems')
        .insert({
          track_id: trackId,
          version_id: versionId,
          stem_type: stemType,
          separation_mode: separationMode,
          audio_url: sanitizeText(audioUrl, 1000),
          suno_task_id: stemTaskId,
          metadata: { suno_data: stem }
        });

      if (stemError) {
        console.error('Error inserting stem:', stemError);
        continue;
      }
    }

    console.log('Stems callback: completed', { trackId, versionId, stemsCount: stems.length });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in stems-callback function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});