/**
 * Resync Track Data Edge Function
 * 
 * Fetches full generation data from Suno/Mureka API and updates:
 * - Track metadata (title, tags, lyrics, etc.)
 * - All track versions/variants
 * - Missing audio URLs
 * - Corrects version numbering
 * 
 * Usage: POST /functions/v1/resync-track-data
 * Body: { trackId: string, force?: boolean }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SunoTaskData {
  id: string;
  title: string;
  lyrics: string;
  audioUrl: string;
  imageUrl: string;
  videoUrl: string;
  duration: number;
  tags: string;
  prompt: string;
  status: string;
  createdAt: string;
  model: string;
}

interface SunoQueryResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    parentMusicId?: string;
    param?: string;
    response: {
      taskId: string;
      sunoData: SunoTaskData[];
    };
    status: string;
    type?: string;
    errorCode?: number;
    errorMessage?: string;
  };
}

async function querySunoTask(taskId: string): Promise<{ data: SunoTaskData[] | null; status: number }> {
  console.log(`[Resync] Querying Suno API for task: ${taskId}`);
  
  // Use the correct Suno API endpoint
  const response = await fetch(`https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`, {
    headers: {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Accept': 'application/json',
    },
  });

  const status = response.status;

  if (!response.ok) {
    console.error(`[Resync] Suno API error: ${status}`);
    return { data: null, status };
  }

  const result: SunoQueryResponse = await response.json();
  
  // Check response according to API documentation
  if (result.code !== 200) {
    console.error('[Resync] Suno API returned error:', result);
    return { data: null, status: result.code };
  }

  if (!result.data?.response?.sunoData) {
    console.error('[Resync] Invalid Suno response structure:', result);
    return { data: null, status: 422 };
  }

  return { data: result.data.response.sunoData, status: 200 };
}

async function updateTrackFromSunoData(
  supabase: any,
  trackId: string,
  sunoData: SunoTaskData[],
  mainTrack: any
) {
  console.log(`[Resync] Updating track ${trackId} with ${sunoData.length} variants`);

  // Update main track with first variant data
  const mainVariant = sunoData[0];
  if (mainVariant) {
    const { error: updateError } = await supabase
      .from('tracks')
      .update({
        title: mainVariant.title || mainTrack.title,
        lyrics: mainVariant.lyrics,
        audio_url: mainVariant.audioUrl,
        cover_url: mainVariant.imageUrl,
        video_url: mainVariant.videoUrl,
        duration: mainVariant.duration,
        duration_seconds: mainVariant.duration,
        style_tags: mainVariant.tags ? mainVariant.tags.split(',').map((t: string) => t.trim()) : mainTrack.style_tags,
        model_name: mainVariant.model || mainTrack.model_name,
        status: 'completed',
        metadata: {
          ...mainTrack.metadata,
          resynced_at: new Date().toISOString(),
          original_suno_id: mainVariant.id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', trackId);

    if (updateError) {
      console.error('[Resync] Failed to update main track:', updateError);
      throw updateError;
    }

    console.log('[Resync] Main track updated successfully');
  }

  // Update or create track versions for all variants
  for (let i = 0; i < sunoData.length; i++) {
    const variant = sunoData[i];
    const variantIndex = i;

    // Check if version already exists
    const { data: existing } = await supabase
      .from('track_versions')
      .select('id')
      .eq('parent_track_id', trackId)
      .eq('variant_index', variantIndex)
      .maybeSingle();

    const versionData = {
      parent_track_id: trackId,
      variant_index: variantIndex,
      audio_url: variant.audioUrl,
      cover_url: variant.imageUrl,
      video_url: variant.videoUrl,
      duration: variant.duration,
      lyrics: variant.lyrics,
      suno_id: variant.id,
      is_primary_variant: i === 0,
      is_preferred_variant: i === 0,
      metadata: {
        title: variant.title,
        tags: variant.tags,
        prompt: variant.prompt,
        model: variant.model,
        created_at_suno: variant.createdAt,
        resynced: true,
      },
    };

    if (existing) {
      // Update existing version
      const { error } = await supabase
        .from('track_versions')
        .update(versionData)
        .eq('id', existing.id);

      if (error) {
        console.error(`[Resync] Failed to update version ${variantIndex}:`, error);
      } else {
        console.log(`[Resync] Updated version ${variantIndex}`);
      }
    } else {
      // Create new version
      const { error } = await supabase
        .from('track_versions')
        .insert(versionData);

      if (error) {
        console.error(`[Resync] Failed to create version ${variantIndex}:`, error);
      } else {
        console.log(`[Resync] Created version ${variantIndex}`);
      }
    }
  }

  return { success: true, variantsCount: sunoData.length };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get request body
    const { trackId, force = false } = await req.json();

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'trackId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Resync] Starting resync for track: ${trackId}, force: ${force}`);

    // Fetch track data
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      console.error('[Resync] Track not found:', trackError);
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if track has suno_id (task_id)
    const taskId = track.suno_id || track.metadata?.suno_task_id;
    if (!taskId) {
      console.error('[Resync] Track has no Suno task ID');
      return new Response(
        JSON.stringify({ error: 'Track has no Suno task ID - cannot resync' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query Suno API for full generation data
    const { data: sunoData, status: apiStatus } = await querySunoTask(taskId);
    
    if (!sunoData || sunoData.length === 0) {
      console.error('[Resync] No data from Suno API, status:', apiStatus);
      
      // 404 = Track data expired/deleted from Suno (normal for old tracks)
      if (apiStatus === 404) {
        return new Response(
          JSON.stringify({ 
            error: 'Track data no longer available on Suno API',
            message: 'This track is too old - Suno has already deleted the generation data. The existing track data cannot be updated.',
            trackId,
            statusCode: 404,
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Other errors
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch data from Suno API',
          message: 'Unable to retrieve generation data. Please try again later.',
          statusCode: apiStatus,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update track and versions
    const result = await updateTrackFromSunoData(supabase, trackId, sunoData, track);

    console.log('[Resync] Resync completed successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Track data resynced successfully',
        trackId,
        variantsCount: result.variantsCount,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Resync] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
