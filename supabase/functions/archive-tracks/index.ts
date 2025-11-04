import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { trackId, limit = 50 } = await req.json().catch(() => ({}));

    console.log('🗄️ Starting archiving process', { trackId, limit });

    // Get tracks needing archiving
    const { data: tracks, error: fetchError } = await supabaseClient
      .rpc('get_tracks_needing_archiving', { _limit: limit });

    if (fetchError) {
      console.error('❌ Failed to fetch tracks', fetchError);
      throw new Error(`Failed to fetch tracks: ${fetchError.message}`);
    }

    if (!tracks || tracks.length === 0) {
      console.log('✅ No tracks need archiving');
      return new Response(
        JSON.stringify({ success: true, archived: 0, failed: 0, message: 'No tracks to archive' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Found ${tracks.length} tracks to archive`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ trackId: string; error: string }>,
    };

    for (const track of tracks as Track[]) {
      try {
        console.log(`🔄 Archiving track ${track.track_id}: "${track.title}"`);

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
        console.log(`✅ Successfully archived track ${track.track_id}`);

      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push({ trackId: track.track_id, error: errorMessage });
        
        console.error(`❌ Failed to archive track ${track.track_id}:`, errorMessage);

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

    console.log(`📊 Archiving complete: ${results.success} success, ${results.failed} failed`);

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
    console.error('❌ Archive tracks error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
