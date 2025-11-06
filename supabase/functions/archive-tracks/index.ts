import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { logger } from "../_shared/logger.ts";

interface Track {
  track_id: string;
  user_id: string;
  title: string;
  audio_url: string;
  cover_url: string;
  video_url: string;
  created_at: string;
}

serve(async (req) => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', 'archive-tracks');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error('Authentication failed', userError ?? new Error('No user'), 'archive-tracks');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use admin client for database operations
    const supabaseClient = createSupabaseAdminClient();

    const { trackId, limit = 50 } = await req.json().catch(() => ({}));

    logger.info('Starting archiving process', 'archive-tracks', { trackId, limit, userId: user.id });

    // Get tracks needing archiving
    const { data: tracks, error: fetchError } = await supabaseClient
      .rpc('get_tracks_needing_archiving', { _limit: limit });

    if (fetchError) {
      logger.error('Failed to fetch tracks', fetchError, 'archive-tracks');
      throw new Error(`Failed to fetch tracks: ${fetchError.message}`);
    }

    if (!tracks || tracks.length === 0) {
      logger.info('No tracks need archiving', 'archive-tracks');
      return new Response(
        JSON.stringify({ success: true, archived: 0, failed: 0, message: 'No tracks to archive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`Found ${tracks.length} tracks to archive`, 'archive-tracks');

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ trackId: string; error: string }>,
    };

    for (const track of tracks as Track[]) {
      try {
        logger.info(`Archiving track ${track.track_id}: "${track.title}"`, 'archive-tracks');

        // Create archiving job
        const { data: job, error: jobError } = await supabaseClient
          .from('track_archiving_jobs')
          .insert({
            track_id: track.track_id,
            user_id: track.user_id,
            status: 'processing',
            original_audio_url: track.audio_url,
            original_cover_url: track.cover_url,
            original_video_url: track.video_url,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (jobError) {
          throw new Error(`Failed to create job: ${jobError.message}`);
        }

        // Download and upload files
        const storageUrls: {
          storage_audio_url?: string;
          storage_cover_url?: string;
          storage_video_url?: string;
        } = {};

        // Archive audio
        if (track.audio_url) {
          const audioPath = `${track.user_id}/${track.track_id}/audio.mp3`;
          const audioBlob = await fetch(track.audio_url).then(r => r.blob());
          
          const { error: uploadError } = await supabaseClient.storage
            .from('tracks-audio')
            .upload(audioPath, audioBlob, { upsert: true });

          if (!uploadError) {
            const { data } = supabaseClient.storage
              .from('tracks-audio')
              .getPublicUrl(audioPath);
            storageUrls.storage_audio_url = data.publicUrl;
          }
        }

        // Archive cover
        if (track.cover_url) {
          const coverPath = `${track.user_id}/${track.track_id}/cover.jpg`;
          const coverBlob = await fetch(track.cover_url).then(r => r.blob());
          
          const { error: uploadError } = await supabaseClient.storage
            .from('tracks-covers')
            .upload(coverPath, coverBlob, { upsert: true });

          if (!uploadError) {
            const { data } = supabaseClient.storage
              .from('tracks-covers')
              .getPublicUrl(coverPath);
            storageUrls.storage_cover_url = data.publicUrl;
          }
        }

        // Archive video
        if (track.video_url) {
          const videoPath = `${track.user_id}/${track.track_id}/video.mp4`;
          const videoBlob = await fetch(track.video_url).then(r => r.blob());
          
          const { error: uploadError } = await supabaseClient.storage
            .from('tracks-videos')
            .upload(videoPath, videoBlob, { upsert: true });

          if (!uploadError) {
            const { data } = supabaseClient.storage
              .from('tracks-videos')
              .getPublicUrl(videoPath);
            storageUrls.storage_video_url = data.publicUrl;
          }
        }

        // Update track
        await supabaseClient
          .from('tracks')
          .update({
            archived_to_storage: true,
            ...storageUrls,
            archived_at: new Date().toISOString(),
          })
          .eq('id', track.track_id);

        // Update job
        await supabaseClient
          .from('track_archiving_jobs')
          .update({
            status: 'completed',
            ...storageUrls,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.success++;
        logger.info(`Successfully archived track ${track.track_id}`, 'archive-tracks');

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ trackId: track.track_id, error: errorMessage });

        logger.error(`Failed to archive track ${track.track_id}`, error instanceof Error ? error : new Error(errorMessage), 'archive-tracks');

        // Update job as failed
        await supabaseClient
          .from('track_archiving_jobs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq('track_id', track.track_id)
          .eq('status', 'processing');
      }
    }

    logger.info(`Archiving complete: ${results.success} success, ${results.failed} failed`, 'archive-tracks');

    return new Response(
      JSON.stringify({
        success: true,
        archived: results.success,
        failed: results.failed,
        errors: results.errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Archive tracks error', error instanceof Error ? error : new Error(String(error)), 'archive-tracks');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
