import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createSunoClient } from "../_shared/suno.ts";
import { logger } from "../_shared/logger.ts";

/**
 * Edge Function для проверки и синхронизации застрявших треков
 * Запускается автоматически через cron или вручную
 */
serve(async (req: Request): Promise<Response> => {
  const corsHeaders = createCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');

    // Опционально принимаем список trackIds для точечной синхронизации
    let trackIds: string[] = [];
    try {
      const body = await req.json();
      if (body && Array.isArray(body.trackIds)) {
        trackIds = body.trackIds.filter((v: unknown) => typeof v === 'string');
      }
    } catch (_) {
      // no body provided
    }

    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Найти все треки в processing старше 10 минут (если trackIds не переданы)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    let query = supabaseAdmin
      .from('tracks')
      .select('id, title, prompt, user_id, created_at, metadata, status');

    if (trackIds.length > 0) {
      query = query.in('id', trackIds);
    } else {
      query = query.eq('status', 'processing').lt('created_at', tenMinutesAgo);
    }

    const { data: stuckTracks, error: fetchError } = await query
      .order('created_at', { ascending: true })
      .limit(20);

    if (fetchError) {
      throw fetchError;
    }

    logger.info('🔍 Checking stuck tracks', { count: stuckTracks?.length || 0 });

    if (!stuckTracks || stuckTracks.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No stuck tracks found',
        checkedCount: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
    const results = [];

    for (const track of stuckTracks) {
      const metadata = track.metadata as Record<string, unknown> | null;
      const taskId = metadata?.suno_task_id as string | undefined;

      if (!taskId) {
        logger.warn('⚠️ Track without taskId', { trackId: track.id, title: track.title });
        
        // Отметить как failed если нет taskId и трек старше 15 минут
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        if (new Date(track.created_at).getTime() < fifteenMinutesAgo) {
          await supabaseAdmin
            .from('tracks')
            .update({ 
              status: 'failed', 
              error_message: 'No Suno task ID - generation may have failed to start' 
            })
            .eq('id', track.id);
          
          results.push({ trackId: track.id, action: 'marked_failed_no_taskid' });
        }
        continue;
      }

      try {
        logger.info('📊 Querying Suno for stuck track', { trackId: track.id, taskId });
        
        const queryResult = await sunoClient.queryTask(taskId);
        
        logger.info('📥 Suno query result', { 
          trackId: track.id, 
          taskId,
          status: queryResult.status,
          tasksCount: queryResult.tasks?.length || 0
        });

        // Проверить статус
        if (queryResult.status === 'SUCCESS') {
          const successfulTracks = queryResult.tasks.filter(t => t.audioUrl);
          
          if (successfulTracks.length > 0) {
            const mainTrack = successfulTracks[0];
            logger.info('✅ Found completed track', { 
              trackId: track.id, 
              audioUrl: mainTrack.audioUrl?.substring(0, 50),
              versionsCount: successfulTracks.length
            });
            
            // Import storage helpers dynamically
            const { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } = 
              await import('../_shared/storage.ts');
            
            // Download and upload main track assets to storage
            let uploadedAudioUrl = mainTrack.audioUrl || null;
            if (mainTrack.audioUrl) {
              uploadedAudioUrl = await downloadAndUploadAudio(
                mainTrack.audioUrl, 
                track.id, 
                track.user_id, 
                'main.mp3', 
                supabaseAdmin
              );
              logger.info('📥 Main audio uploaded', { trackId: track.id, url: uploadedAudioUrl?.substring(0, 50) });
            }
            
            let uploadedCoverUrl = mainTrack.imageUrl || null;
            if (uploadedCoverUrl) {
              uploadedCoverUrl = await downloadAndUploadCover(
                uploadedCoverUrl, 
                track.id, 
                track.user_id, 
                'cover.jpg', 
                supabaseAdmin
              );
              logger.info('📥 Cover uploaded', { trackId: track.id });
            }
            
            let uploadedVideoUrl = mainTrack.streamAudioUrl || null;
            if (uploadedVideoUrl) {
              uploadedVideoUrl = await downloadAndUploadVideo(
                uploadedVideoUrl, 
                track.id, 
                track.user_id, 
                'video.mp4', 
                supabaseAdmin
              );
              logger.info('📥 Video uploaded', { trackId: track.id });
            }
            
            // Normalize tags
            const rawTags = Array.isArray(mainTrack.tags)
              ? mainTrack.tags.join(',')
              : typeof mainTrack.tags === 'string'
                ? mainTrack.tags
                : '';
            const styleTags = rawTags
              ? [...new Set(rawTags.split(/[,;]/).map((tag: string) => tag.trim()).filter(Boolean))]
              : null;
            
            // Only update title if it's empty or default
            const shouldUpdateTitle = !track.title || 
              track.title === 'Untitled Track' || 
              track.title === 'Generated Track' ||
              (track.prompt && track.title === track.prompt);
            
            const updateData: any = {
              status: 'completed',
              audio_url: uploadedAudioUrl,
              video_url: uploadedVideoUrl,
              cover_url: uploadedCoverUrl,
              lyrics: mainTrack.prompt || null,
              duration: mainTrack.duration ? Math.round(mainTrack.duration) : null,
              duration_seconds: mainTrack.duration ? Math.round(mainTrack.duration) : null,
              model_name: mainTrack.modelName || null,
              style_tags: styleTags,
              suno_id: mainTrack.id || null,
              created_at_suno: mainTrack.createTime || null,
              metadata: {
                ...metadata,
                sync_check_at: new Date().toISOString(),
                sync_found_completed: true,
                suno_data: queryResult.tasks,
                source: 'stuck-sync'
              }
            };
            
            if (shouldUpdateTitle && mainTrack.title) {
              updateData.title = mainTrack.title;
            }
            
            // Full sync of main track with all metadata
            await supabaseAdmin
              .from('tracks')
              .update(updateData)
              .eq('id', track.id);
            
            logger.info('✅ Main track fully synced', { 
              trackId: track.id,
              title: mainTrack.title || track.title,
              duration: mainTrack.duration,
              hasLyrics: !!mainTrack.prompt,
              tagsCount: styleTags?.length || 0,
              titleUpdated: shouldUpdateTitle
            });
            
            // Create/update track versions for additional variants
            if (successfulTracks.length > 1) {
              for (let i = 1; i < successfulTracks.length; i++) {
                const versionTrack = successfulTracks[i];
                if (!versionTrack.audioUrl) {
                  logger.warn(`Version ${i} missing audio URL, skipping`, { trackId: track.id });
                  continue;
                }
                
                const versionAudioUrl = await downloadAndUploadAudio(
                  versionTrack.audioUrl,
                  track.id,
                  track.user_id,
                  `version-${i}.mp3`,
                  supabaseAdmin
                );
                
                let versionCoverUrl = versionTrack.imageUrl || null;
                if (versionCoverUrl) {
                  versionCoverUrl = await downloadAndUploadCover(
                    versionCoverUrl,
                    track.id,
                    track.user_id,
                    `version-${i}-cover.jpg`,
                    supabaseAdmin
                  );
                }
                
                let versionVideoUrl = versionTrack.streamAudioUrl || null;
                if (versionVideoUrl) {
                  versionVideoUrl = await downloadAndUploadVideo(
                    versionVideoUrl,
                    track.id,
                    track.user_id,
                    `version-${i}-video.mp4`,
                    supabaseAdmin
                  );
                }
                
                const { error: versionError } = await supabaseAdmin
                  .from('track_versions')
                  .upsert({
                    parent_track_id: track.id,
                    version_number: i,
                    is_master: false,
                    suno_id: versionTrack.id || null,
                    audio_url: versionAudioUrl,
                    video_url: versionVideoUrl,
                    cover_url: versionCoverUrl,
                    lyrics: versionTrack.prompt || null,
                    duration: versionTrack.duration ? Math.round(versionTrack.duration) : null,
                    metadata: {
                      suno_track_data: versionTrack,
                      generated_via: 'stuck-sync',
                      suno_task_id: taskId,
                    }
                  }, { onConflict: 'parent_track_id,version_number' });
                
                if (versionError) {
                  logger.error(`Error saving version ${i}`, { error: versionError, trackId: track.id });
                } else {
                  logger.info(`✅ Version ${i} saved/updated`, { trackId: track.id });
                }
              }
            }
            
            results.push({ 
              trackId: track.id, 
              action: 'synced_completed',
              audioUrl: uploadedAudioUrl,
              versionsCreated: successfulTracks.length - 1,
              hasLyrics: !!mainTrack.prompt,
              tagsCount: styleTags?.length || 0
            });
          } else {
            // Завершен но без audio
            await supabaseAdmin
              .from('tracks')
              .update({ 
                status: 'failed', 
                error_message: 'Suno reports success but no audio URL' 
              })
              .eq('id', track.id);
            
            results.push({ trackId: track.id, action: 'failed_no_audio' });
          }
        } else if (queryResult.status === 'GENERATE_AUDIO_FAILED' || queryResult.status === 'CREATE_TASK_FAILED') {
          const errorMsg = (queryResult.rawResponse as any)?.data?.errorMessage || 'Suno generation failed';
          
          await supabaseAdmin
            .from('tracks')
            .update({ 
              status: 'failed', 
              error_message: errorMsg 
            })
            .eq('id', track.id);
          
          results.push({ trackId: track.id, action: 'marked_failed', error: errorMsg });
        } else {
          // Все еще processing - обновить метаданные для мониторинга
          await supabaseAdmin
            .from('tracks')
            .update({
              metadata: {
                ...metadata,
                sync_check_at: new Date().toISOString(),
                sync_status: queryResult.status,
              }
            })
            .eq('id', track.id);
          
          results.push({ trackId: track.id, action: 'still_processing', status: queryResult.status });
        }
      } catch (error) {
        logger.error('🔴 Error checking track', { 
          trackId: track.id,
          error: error instanceof Error ? error.message : String(error)
        });
        
        results.push({ 
          trackId: track.id, 
          action: 'error', 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('✅ Stuck tracks check complete', { 
      totalChecked: results.length,
      results 
    });

    return new Response(JSON.stringify({
      success: true,
      checkedCount: stuckTracks.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('🔴 Error in check-stuck-tracks', { 
      error: error instanceof Error ? error : new Error(String(error))
    });

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
