import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "../_shared/storage.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = createCorsHeaders();

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logger.info('Starting migration of old tracks to Storage', { endpoint: 'migrate-tracks-to-storage' });

    const supabase = createSupabaseAdminClient();

    // Statistics
    let totalTracks = 0;
    let migratedTracks = 0;
    let failedTracks = 0;
    let skippedTracks = 0;

    // ========================================
    // Step 1: Migrate main tracks
    // ========================================
    logger.info('Fetching tracks with external URLs', { endpoint: 'migrate-tracks-to-storage' });

    const { data: tracks, error: fetchError } = await supabase
      .from('tracks')
      .select('id, user_id, audio_url, cover_url, video_url, status')
      .eq('status', 'completed')
      .or('audio_url.like.%cdn.suno.ai%,audio_url.like.%apiboxfiles%,audio_url.like.%mfile%');

    if (fetchError) {
      logger.error('Error fetching tracks', fetchError instanceof Error ? fetchError : new Error(String(fetchError)), 'migrate-tracks-to-storage');
      throw fetchError;
    }

    totalTracks = tracks?.length || 0;
    logger.info('Found tracks to migrate', { endpoint: 'migrate-tracks-to-storage', totalTracks });

    // Migrate each track
    for (const track of tracks || []) {
      logger.info('Processing track', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });

      try {
        // Check if already migrated (URL contains supabase storage)
        if (track.audio_url?.includes('supabase.co/storage')) {
          logger.info('Track already migrated, skipping', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });
          skippedTracks++;
          continue;
        }

        // Check if URL is still accessible
        let audioUrl = track.audio_url;
        let coverUrl = track.cover_url;
        let videoUrl = track.video_url;

        // Try to migrate audio
        if (audioUrl) {
          try {
            audioUrl = await downloadAndUploadAudio(
              track.audio_url,
              track.id,
              track.user_id,
              'main.mp3',
              supabase
            );
            logger.info('Audio migrated for track', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });
          } catch (error) {
            logger.error('Failed to migrate audio', error instanceof Error ? error : new Error(String(error)), 'migrate-tracks-to-storage', { trackId: track.id });
            // Mark track as failed if audio migration fails
            await supabase
              .from('tracks')
              .update({
                status: 'failed',
                error_message: 'Audio URL expired or inaccessible - please regenerate'
              })
              .eq('id', track.id);
            failedTracks++;
            continue; // Skip to next track
          }
        }

        // Try to migrate cover (optional)
        if (coverUrl && !coverUrl.includes('supabase.co/storage')) {
          try {
            coverUrl = await downloadAndUploadCover(
              track.cover_url,
              track.id,
              track.user_id,
              'cover.jpg',
              supabase
            );
            logger.info('Cover migrated for track', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });
          } catch (error) {
            logger.warn('Cover migration failed, keeping original', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });
            // Keep original cover URL, not critical
          }
        }

        // Try to migrate video (optional)
        if (videoUrl && !videoUrl.includes('supabase.co/storage')) {
          try {
            videoUrl = await downloadAndUploadVideo(
              track.video_url,
              track.id,
              track.user_id,
              'video.mp4',
              supabase
            );
            logger.info('Video migrated for track', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });
          } catch (error) {
            logger.warn('Video migration failed, keeping original', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });
            // Keep original video URL, not critical
          }
        }

        // Update track with new URLs
        await supabase
          .from('tracks')
          .update({
            audio_url: audioUrl,
            cover_url: coverUrl,
            video_url: videoUrl
          })
          .eq('id', track.id);

        migratedTracks++;
        logger.info('Track successfully migrated', { endpoint: 'migrate-tracks-to-storage', trackId: track.id });

      } catch (error) {
        logger.error('Error processing track', error instanceof Error ? error : new Error(String(error)), 'migrate-tracks-to-storage', { trackId: track.id });
        failedTracks++;
      }
    }

    // ========================================
    // Step 2: Migrate track versions
    // ========================================
    logger.info('Migrating track versions', { endpoint: 'migrate-tracks-to-storage' });

    const { data: versions, error: versionsError } = await supabase
      .from('track_versions')
      .select('id, parent_track_id, audio_url, cover_url, video_url, version_number')
      .or('audio_url.like.%cdn.suno.ai%,audio_url.like.%apiboxfiles%,audio_url.like.%mfile%');

    if (versionsError) {
      logger.warn('Error fetching versions', { endpoint: 'migrate-tracks-to-storage', error: versionsError.message });
    } else {
      logger.info('Found versions to migrate', { endpoint: 'migrate-tracks-to-storage', versionsCount: versions?.length || 0 });

      for (const version of versions || []) {
        try {
          // Skip if already migrated
          if (version.audio_url?.includes('supabase.co/storage')) {
            logger.info('Version already migrated', { endpoint: 'migrate-tracks-to-storage', versionId: version.id });
            continue;
          }

          // Get parent track to find user_id
          const { data: parentTrack } = await supabase
            .from('tracks')
            .select('user_id')
            .eq('id', version.parent_track_id)
            .single();

          if (!parentTrack) {
            logger.error('Parent track not found for version', new Error('Parent track not found'), 'migrate-tracks-to-storage', { versionId: version.id });
            continue;
          }

          // Migrate version files
          let versionAudioUrl = version.audio_url;
          let versionCoverUrl = version.cover_url;
          let versionVideoUrl = version.video_url;

          if (versionAudioUrl) {
            try {
              versionAudioUrl = await downloadAndUploadAudio(
                version.audio_url,
                version.parent_track_id,
                parentTrack.user_id,
                `version-${version.version_number}.mp3`,
                supabase
              );
            } catch (error) {
              logger.error('Failed to migrate version audio', error instanceof Error ? error : new Error(String(error)), 'migrate-tracks-to-storage', { versionId: version.id });
              // Delete broken version
              await supabase
                .from('track_versions')
                .delete()
                .eq('id', version.id);
              continue;
            }
          }

          if (versionCoverUrl && !versionCoverUrl.includes('supabase.co/storage')) {
            try {
              versionCoverUrl = await downloadAndUploadCover(
                version.cover_url,
                version.parent_track_id,
                parentTrack.user_id,
                `version-${version.version_number}-cover.jpg`,
                supabase
              );
            } catch (error) {
              logger.warn('Cover migration failed for version', { endpoint: 'migrate-tracks-to-storage', versionId: version.id });
            }
          }

          if (versionVideoUrl && !versionVideoUrl.includes('supabase.co/storage')) {
            try {
              versionVideoUrl = await downloadAndUploadVideo(
                version.video_url,
                version.parent_track_id,
                parentTrack.user_id,
                `version-${version.version_number}-video.mp4`,
                supabase
              );
            } catch (error) {
              logger.warn('Video migration failed for version', { endpoint: 'migrate-tracks-to-storage', versionId: version.id });
            }
          }

          // Update version
          await supabase
            .from('track_versions')
            .update({
              audio_url: versionAudioUrl,
              cover_url: versionCoverUrl,
              video_url: versionVideoUrl
            })
            .eq('id', version.id);

          logger.info('Version migrated successfully', { endpoint: 'migrate-tracks-to-storage', versionId: version.id });

        } catch (error) {
          logger.error('Error migrating version', error instanceof Error ? error : new Error(String(error)), 'migrate-tracks-to-storage', { versionId: version.id });
        }
      }
    }

    // ========================================
    // Summary
    // ========================================
    const summary = {
      total: totalTracks,
      migrated: migratedTracks,
      failed: failedTracks,
      skipped: skippedTracks,
      success_rate: totalTracks > 0 ? ((migratedTracks / totalTracks) * 100).toFixed(1) : 0
    };

    logger.info('Migration Summary', { endpoint: 'migrate-tracks-to-storage', summary });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration completed',
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    logger.error('Migration error', error instanceof Error ? error : new Error(String(error)), 'migrate-tracks-to-storage');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Migration failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
