/**
 * Archive Tracks Edge Function
 * 
 * Purpose: Automatically archive tracks from provider to Supabase Storage
 * Critical: Provider tracks expire after 15 days
 * 
 * Features:
 * - Downloads audio/cover/video from provider URLs
 * - Uploads to Supabase Storage buckets
 * - Updates tracks table with storage URLs
 * - Handles retry logic and error tracking
 * 
 * Schedule: Run daily via cron or manual trigger
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ArchiveRequest {
  trackId?: string; // Optional: archive specific track
  limit?: number; // Limit number of tracks to archive per run
}

interface Track {
  track_id: string;
  user_id: string;
  title: string;
  audio_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  created_at: string;
  days_until_expiry: number;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request
    const body: ArchiveRequest = req.method === 'POST' 
      ? await req.json() 
      : {};
    
    const { trackId, limit = 50 } = body;

    console.log('🗄️ Starting track archiving process', { 
      trackId, 
      limit,
      timestamp: new Date().toISOString() 
    });

    // Get tracks needing archiving
    let tracksToArchive: Track[] = [];
    
    if (trackId) {
      // Archive specific track
      const { data: track, error } = await supabase
        .from('tracks')
        .select('id, user_id, title, audio_url, cover_url, video_url, created_at')
        .eq('id', trackId)
        .single();

      if (error) throw error;
      if (track) {
        tracksToArchive = [{
          track_id: track.id,
          user_id: track.user_id,
          title: track.title,
          audio_url: track.audio_url,
          cover_url: track.cover_url,
          video_url: track.video_url,
          created_at: track.created_at,
          days_until_expiry: 15 - Math.floor((Date.now() - new Date(track.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        }];
      }
    } else {
      // Get tracks from function
      const { data, error } = await supabase.rpc('get_tracks_needing_archiving', {
        _limit: limit,
      });

      if (error) throw error;
      tracksToArchive = data || [];
    }

    console.log(`📋 Found ${tracksToArchive.length} tracks to archive`);

    if (tracksToArchive.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tracks need archiving',
          archived: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = {
      total: tracksToArchive.length,
      succeeded: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each track
    for (const track of tracksToArchive) {
      try {
        console.log(`📦 Archiving track: ${track.title} (ID: ${track.track_id})`);
        console.log(`⏰ Days until expiry: ${track.days_until_expiry}`);

        // Create archiving job
        const { data: job, error: jobError } = await supabase
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
          console.error('Failed to create archiving job:', jobError);
          throw jobError;
        }

        const storageUrls: {
          audio?: string;
          cover?: string;
          video?: string;
        } = {};

        // Archive audio (required)
        if (track.audio_url) {
          try {
            const audioPath = await downloadAndUpload(
              supabase,
              track.audio_url,
              'tracks-audio',
              `${track.user_id}/${track.track_id}.mp3`,
              'audio/mpeg'
            );
            storageUrls.audio = audioPath;
            console.log(`✅ Audio archived: ${audioPath}`);
          } catch (audioError) {
            const errorMsg = audioError instanceof Error ? audioError.message : 'Unknown error';
            console.error('Failed to archive audio:', audioError);
            throw new Error(`Audio archiving failed: ${errorMsg}`);
          }
        }

        // Archive cover (optional)
        if (track.cover_url) {
          try {
            const coverPath = await downloadAndUpload(
              supabase,
              track.cover_url,
              'tracks-covers',
              `${track.user_id}/${track.track_id}.jpg`,
              'image/jpeg'
            );
            storageUrls.cover = coverPath;
            console.log(`✅ Cover archived: ${coverPath}`);
          } catch (error) {
            console.warn('Failed to archive cover (non-critical):', error);
          }
        }

        // Archive video (optional)
        if (track.video_url) {
          try {
            const videoPath = await downloadAndUpload(
              supabase,
              track.video_url,
              'tracks-videos',
              `${track.user_id}/${track.track_id}.mp4`,
              'video/mp4'
            );
            storageUrls.video = videoPath;
            console.log(`✅ Video archived: ${videoPath}`);
          } catch (error) {
            console.warn('Failed to archive video (non-critical):', error);
          }
        }

        // Mark track as archived
        const { error: markError } = await supabase.rpc('mark_track_archived', {
          _track_id: track.track_id,
          _storage_audio_url: storageUrls.audio || null,
          _storage_cover_url: storageUrls.cover || null,
          _storage_video_url: storageUrls.video || null,
        });

        if (markError) throw markError;

        // Update job status
        await supabase
          .from('track_archiving_jobs')
          .update({
            status: 'completed',
            storage_audio_url: storageUrls.audio,
            storage_cover_url: storageUrls.cover,
            storage_video_url: storageUrls.video,
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        results.succeeded++;
        console.log(`✅ Successfully archived track: ${track.title}`);

      } catch (trackError) {
        const errorMsg = trackError instanceof Error ? trackError.message : 'Unknown error';
        results.failed++;
        results.errors.push({
          trackId: track.track_id,
          title: track.title,
          error: errorMsg,
        });

        console.error(`❌ Failed to archive track ${track.title}:`, trackError);

        // Update job with error
        await supabase
          .from('track_archiving_jobs')
          .update({
            status: 'failed',
            error_message: errorMsg,
            completed_at: new Date().toISOString(),
          })
          .eq('track_id', track.track_id)
          .eq('status', 'processing');
      }
    }

    console.log('📊 Archiving complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Archived ${results.succeeded}/${results.total} tracks`,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (funcError) {
    const errorMsg = funcError instanceof Error ? funcError.message : 'Unknown error';
    console.error('❌ Archive function error:', funcError);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

/**
 * Download file from URL and upload to Supabase Storage
 */
async function downloadAndUpload(
  supabase: any,
  sourceUrl: string,
  bucket: string,
  path: string,
  contentType: string
): Promise<string> {
  // Download file
  console.log(`📥 Downloading: ${sourceUrl}`);
  const response = await fetch(sourceUrl);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  console.log(`📤 Uploading to: ${bucket}/${path} (${(uint8Array.length / 1024 / 1024).toFixed(2)}MB)`);

  // Upload to storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, uint8Array, {
      contentType,
      upsert: true, // Overwrite if exists
    });

  if (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Upload failed: ${errorMsg}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return publicUrl;
}
