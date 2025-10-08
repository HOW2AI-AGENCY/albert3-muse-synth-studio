import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createCorsHeaders } from "../_shared/cors.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "../_shared/storage.ts";

const corsHeaders = createCorsHeaders();

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 [MIGRATE] Starting migration of old tracks to Storage...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Statistics
    let totalTracks = 0;
    let migratedTracks = 0;
    let failedTracks = 0;
    let skippedTracks = 0;

    // ========================================
    // Step 1: Migrate main tracks
    // ========================================
    console.log('📊 [MIGRATE] Fetching tracks with external URLs...');

    const { data: tracks, error: fetchError } = await supabase
      .from('tracks')
      .select('id, user_id, audio_url, cover_url, video_url, status')
      .eq('status', 'completed')
      .or('audio_url.like.%cdn.suno.ai%,audio_url.like.%apiboxfiles%,audio_url.like.%mfile%');

    if (fetchError) {
      console.error('🔴 [MIGRATE] Error fetching tracks:', fetchError);
      throw fetchError;
    }

    totalTracks = tracks?.length || 0;
    console.log(`📦 [MIGRATE] Found ${totalTracks} tracks to migrate`);

    // Migrate each track
    for (const track of tracks || []) {
      console.log(`\n🔄 [MIGRATE] Processing track ${track.id}...`);

      try {
        // Check if already migrated (URL contains supabase storage)
        if (track.audio_url?.includes('supabase.co/storage')) {
          console.log(`⏭️  [MIGRATE] Track ${track.id} already migrated, skipping`);
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
            console.log(`✅ [MIGRATE] Audio migrated for track ${track.id}`);
          } catch (error) {
            console.error(`❌ [MIGRATE] Failed to migrate audio for ${track.id}:`, error);
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
            console.log(`✅ [MIGRATE] Cover migrated for track ${track.id}`);
          } catch (error) {
            console.warn(`⚠️  [MIGRATE] Cover migration failed for ${track.id}, keeping original`);
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
            console.log(`✅ [MIGRATE] Video migrated for track ${track.id}`);
          } catch (error) {
            console.warn(`⚠️  [MIGRATE] Video migration failed for ${track.id}, keeping original`);
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
        console.log(`✅ [MIGRATE] Track ${track.id} successfully migrated`);

      } catch (error) {
        console.error(`🔴 [MIGRATE] Error processing track ${track.id}:`, error);
        failedTracks++;
      }
    }

    // ========================================
    // Step 2: Migrate track versions
    // ========================================
    console.log('\n📊 [MIGRATE] Migrating track versions...');

    const { data: versions, error: versionsError } = await supabase
      .from('track_versions')
      .select('id, parent_track_id, audio_url, cover_url, video_url, version_number')
      .or('audio_url.like.%cdn.suno.ai%,audio_url.like.%apiboxfiles%,audio_url.like.%mfile%');

    if (versionsError) {
      console.warn('⚠️  [MIGRATE] Error fetching versions:', versionsError);
    } else {
      console.log(`📦 [MIGRATE] Found ${versions?.length || 0} versions to migrate`);

      for (const version of versions || []) {
        try {
          // Skip if already migrated
          if (version.audio_url?.includes('supabase.co/storage')) {
            console.log(`⏭️  [MIGRATE] Version ${version.id} already migrated`);
            continue;
          }

          // Get parent track to find user_id
          const { data: parentTrack } = await supabase
            .from('tracks')
            .select('user_id')
            .eq('id', version.parent_track_id)
            .single();

          if (!parentTrack) {
            console.error(`❌ [MIGRATE] Parent track not found for version ${version.id}`);
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
              console.error(`❌ [MIGRATE] Failed to migrate version ${version.id} audio`);
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
              console.warn(`⚠️  [MIGRATE] Cover migration failed for version ${version.id}`);
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
              console.warn(`⚠️  [MIGRATE] Video migration failed for version ${version.id}`);
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

          console.log(`✅ [MIGRATE] Version ${version.id} migrated successfully`);

        } catch (error) {
          console.error(`🔴 [MIGRATE] Error migrating version ${version.id}:`, error);
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

    console.log('\n📊 [MIGRATE] Migration Summary:', JSON.stringify(summary, null, 2));

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
    console.error('🔴 [MIGRATE] Migration error:', error);
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
