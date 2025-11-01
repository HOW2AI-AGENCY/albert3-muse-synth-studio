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
    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');

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
      .select('id, title, prompt, user_id, provider, created_at, metadata, status, mureka_task_id, suno_id');

    if (trackIds.length > 0) {
      query = query.in('id', trackIds);
    } else {
      query = query.eq('status', 'processing').lt('created_at', tenMinutesAgo);
    }

    let { data: stuckTracks, error: fetchError } = await query
      .order('created_at', { ascending: true })
      .limit(20);
    
    if (fetchError) {
      throw fetchError;
    }
    
    // ✅ ALSO CHECK: Tracks with callback errors
    const { data: errorTracks, error: errorTracksErr } = await supabaseAdmin
      .from('tracks')
      .select('id, title, prompt, user_id, provider, created_at, metadata, status, mureka_task_id, suno_id')
      .eq('status', 'processing')
      .not('metadata->>callback_error', 'is', null)
      .limit(10);
    
    if (!errorTracksErr && errorTracks && errorTracks.length > 0) {
      logger.warn('⚠️ Found tracks with callback errors', { count: errorTracks.length });
      // Add them to the list for checking
      const allTracksToCheck = [...(stuckTracks || []), ...errorTracks];
      const uniqueTracks = Array.from(new Map(allTracksToCheck.map(t => [t.id, t])).values());
      stuckTracks = uniqueTracks;
    }

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

    const results = [];

    for (const track of stuckTracks) {
      const provider = track.provider || 'suno'; // default to suno for legacy tracks
      const metadata = track.metadata as Record<string, unknown> | null;
      const md = (metadata || {}) as Record<string, any>;
      
      // ✅ Support both Suno and Mureka - improved extraction
      const taskId = provider === 'mureka' 
        ? (track.mureka_task_id || (md.mureka_task_id as string | undefined))
        : (
            (md.suno_task_id as string | undefined) ||      // Priority 1: metadata.suno_task_id
            track.suno_id ||                                 // Priority 2: suno_id column (legacy)
            (md.task_id as string | undefined) ||            // Priority 3: generic task_id
            (md.taskId as string | undefined) ||             // Priority 4: camelCase variant
            (md.sunoTaskId as string | undefined)            // Priority 5: explicit sunoTaskId
          );

      if (!taskId) {
        logger.error('🔴 No taskId found for stuck track', { 
          trackId: track.id, 
          title: track.title,
          provider,
          metadata_keys: Object.keys(md),
          mureka_task_id: track.mureka_task_id,
          suno_id: track.suno_id,
          created_at: track.created_at
        });
        
        // Отметить как failed если нет taskId и трек старше 15 минут
        const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;
        if (new Date(track.created_at).getTime() < fifteenMinutesAgo) {
          logger.info('⚠️ Marking old stuck track without taskId as failed', { 
            trackId: track.id, 
            provider,
            age_minutes: Math.round((Date.now() - new Date(track.created_at).getTime()) / 60000)
          });
          
          await supabaseAdmin
            .from('tracks')
            .update({ 
              status: 'failed', 
              error_message: `No ${provider} task ID found. Track may have failed during initialization.`,
              metadata: {
                ...md,
                marked_failed_by: 'check-stuck-tracks',
                marked_failed_at: new Date().toISOString(),
                failed_reason: 'missing_task_id'
              }
            })
            .eq('id', track.id);
          
          logger.info(`✅ Track marked as failed (no task ID)`, { trackId: track.id, provider });
          results.push({ trackId: track.id, action: 'marked_failed_no_taskid', provider });
        } else {
          results.push({ trackId: track.id, action: 'skipped_too_young', provider });
        }
        continue;
      }

      logger.info(`🔍 Processing stuck ${provider} track`, { 
        trackId: track.id, 
        taskId, 
        title: track.title,
        created_at: track.created_at 
      });

      // ✅ Process based on provider
      if (provider === 'mureka') {
        if (!MUREKA_API_KEY) {
          logger.warn('⚠️ MUREKA_API_KEY not configured, skipping Mureka track');
          continue;
        }
        
        try {
          const { createMurekaClient } = await import('../_shared/mureka.ts');
          const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
          
          logger.info('📊 Querying Mureka for stuck track', { trackId: track.id, taskId });
          
          const queryResult = await murekaClient.queryTask(taskId);
          
          logger.info('📥 Mureka query result', { 
            trackId: track.id, 
            taskId,
            code: queryResult.code,
            status: queryResult.data?.status,
            clipsCount: queryResult.data?.clips?.length || 0
          });

          // ✅ FIX: Handle Mureka response - support both v7 API formats
          const rawStatus = (queryResult.data as any)?.status;
          const clips = queryResult.data?.clips || [];
          const choices = queryResult.data?.choices || [];
          
          // ✅ Проверяем СНАЧАЛА choices (новый формат), потом clips (legacy)
          const tracksToCheck = choices.length > 0 ? choices : clips;
          const mainClip = tracksToCheck[0];
          
          // ✅ FIX: Определяем streaming фазу
          const hasStreamUrl = mainClip && (mainClip.stream_url);
          const hasFinalAudioUrl = mainClip && (mainClip.url || mainClip.audio_url);
          const isStreaming = hasStreamUrl && !hasFinalAudioUrl;
          
          // ✅ ВАЖНО: НЕ маркировать как failed если streaming
          if (isStreaming && (rawStatus === 'streaming' || rawStatus === 'running')) {
            logger.info('🎵 Track is streaming, keeping as processing', { 
              trackId: track.id, 
              status: rawStatus,
              hasStreamUrl: !!hasStreamUrl,
              hasChoices: choices.length > 0
            });
            
            await supabaseAdmin
              .from('tracks')
              .update({
                metadata: {
                  ...metadata,
                  sync_check_at: new Date().toISOString(),
                  sync_status: 'streaming',
                }
              })
              .eq('id', track.id);
            
            results.push({ 
              trackId: track.id, 
              action: 'still_streaming',
              provider: 'mureka',
              status: rawStatus 
            });
            continue; // Skip to next track
          }
          
          // ✅ Успешное завершение - есть финальный audio_url
          if (queryResult.code === 200 && tracksToCheck.length > 0 && hasFinalAudioUrl && !isStreaming) {
            const clip = mainClip;
            const audioUrlFromApi = clip.url || clip.audio_url; // Support both formats (NOT stream_url for final save)
            
            // Download and upload to storage
            const { downloadAndUploadAudio, downloadAndUploadCover } = 
              await import('../_shared/storage.ts');
            
            let audioUrl = audioUrlFromApi as string;
            let coverUrl = (clip.image_url || clip.cover_url) as string | undefined;
            
            try {
              audioUrl = await downloadAndUploadAudio(
                audioUrlFromApi as string,
                track.user_id,
                track.id,
                'main.mp3',
                supabaseAdmin
              );
              
              if (coverUrl) {
                coverUrl = await downloadAndUploadCover(
                  coverUrl,
                  track.user_id,
                  track.id,
                  'cover.webp',
                  supabaseAdmin
                );
              }
            } catch (uploadError) {
              logger.error('⚠️ Upload to storage failed, using external URLs', {
                error: uploadError,
                trackId: track.id
              });
            }
            
            await supabaseAdmin
              .from('tracks')
              .update({
                status: 'completed',
                audio_url: audioUrl,
                cover_url: coverUrl,
                duration: (clip.duration as number) || null,
                metadata: {
                  ...metadata,
                  sync_check_at: new Date().toISOString(),
                  sync_found_completed: true,
                  source: 'stuck-sync-mureka'
                }
              })
              .eq('id', track.id);
            
            logger.info('✅ Mureka track synced to completed', { trackId: track.id });
            results.push({ 
              trackId: track.id, 
              action: 'synced_completed',
              provider: 'mureka'
            });
            
          // ✅ Фейл только если явная ошибка от API
          } else if (queryResult.code !== 200 || rawStatus === 'failed' || rawStatus === 'timeouted' || rawStatus === 'cancelled') {
            logger.info('🔍 Attempting to mark Mureka track as failed', { 
              trackId: track.id, 
              provider: 'mureka',
              reason: 'api_reported_failure',
              api_code: queryResult.code,
              api_msg: queryResult.msg
            });
            
            const { error: updateError } = await supabaseAdmin
              .from('tracks')
              .update({ 
                status: 'failed', 
                error_message: queryResult.msg || 'Mureka generation failed',
                metadata: {
                  ...metadata,
                  marked_failed_by: 'check-stuck-tracks',
                  marked_failed_at: new Date().toISOString()
                }
              })
              .eq('id', track.id);
            
            if (updateError) {
              logger.error('❌ Failed to update Mureka track status', { 
                trackId: track.id,
                error: updateError.message,
                code: updateError.code 
              });
            } else {
              logger.info('✅ Mureka track marked as failed', { trackId: track.id });
            }
            
            results.push({ 
              trackId: track.id, 
              action: 'marked_failed',
              provider: 'mureka',
              error: queryResult.msg
            });
            
          // ✅ Все остальные случаи - ещё processing
          } else {
            await supabaseAdmin
              .from('tracks')
              .update({
                metadata: {
                  ...metadata,
                  sync_check_at: new Date().toISOString(),
                  sync_status: rawStatus || 'processing',
                }
              })
              .eq('id', track.id);
            
            results.push({ 
              trackId: track.id, 
              action: 'still_processing',
              provider: 'mureka',
              status: rawStatus 
            });
          }
          
        } catch (error) {
          const errMsg = (() => {
            try {
              if (error instanceof Error) return error.message;
              if (typeof error === 'object') return JSON.stringify(error);
              return String(error);
            } catch {
              return String(error);
            }
          })();
          logger.error('🔴 Error checking Mureka track', { trackId: track.id, error: errMsg });

          const isNotFound = errMsg.includes('404') || errMsg.toLowerCase().includes('not found') || errMsg.includes('All retry attempts failed');

          if (isNotFound) {
            logger.info('🔍 Attempting to mark Mureka track as failed (404)', { 
              trackId: track.id, 
              provider: 'mureka',
              reason: '404_not_found',
              error_excerpt: errMsg.substring(0, 100)
            });
            
            const { error: updateError } = await supabaseAdmin
              .from('tracks')
              .update({
                status: 'failed',
                error_message: errMsg,
                metadata: {
                  ...metadata,
                  sync_check_at: new Date().toISOString(),
                  sync_status: 'failed',
                  sync_error: errMsg,
                  marked_failed_by: 'check-stuck-tracks',
                  marked_failed_at: new Date().toISOString()
                }
              })
              .eq('id', track.id);

            if (updateError) {
              logger.error('❌ Failed to update Mureka track status (404)', { 
                trackId: track.id,
                error: updateError.message,
                code: updateError.code 
              });
            } else {
              logger.info('✅ Mureka track marked as failed due to 404/not found', { trackId: track.id });
            }

            results.push({ trackId: track.id, action: 'marked_failed', provider: 'mureka', error: errMsg });
          } else {
            // Just annotate metadata so the job can revisit later
            await supabaseAdmin
              .from('tracks')
              .update({
                metadata: {
                  ...metadata,
                  sync_check_at: new Date().toISOString(),
                  sync_status: 'error',
                  sync_error: errMsg
                }
              })
              .eq('id', track.id);

            results.push({ trackId: track.id, action: 'error', provider: 'mureka', error: errMsg });
          }
        }
        
        continue;
      }

      // ✅ SUNO PROCESSING (existing logic)
      if (!SUNO_API_KEY) {
        logger.warn('⚠️ SUNO_API_KEY not configured');
        continue;
      }
      
      const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
      
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
            
            // ✅ FIX: Convert Unix timestamp to ISO 8601
            const createdAtSuno = (() => {
              const rawTime = mainTrack.createTime;
              if (!rawTime) return null;
              if (typeof rawTime === 'number') {
                return new Date(rawTime).toISOString();
              }
              if (typeof rawTime === 'string') {
                const parsed = new Date(rawTime);
                return isNaN(parsed.getTime()) ? null : parsed.toISOString();
              }
              return null;
            })();
            
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
              created_at_suno: createdAtSuno,
              metadata: {
                ...metadata,
                sync_check_at: new Date().toISOString(),
                sync_found_completed: true,
                suno_data: queryResult.tasks,
                source: 'stuck-sync',
                callback_error: null // Clear any previous errors
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
                    variant_index: i,
                    is_primary_variant: false,
                    is_preferred_variant: false,
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
                  }, { onConflict: 'parent_track_id,variant_index' });
                
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
    const anyErr = error as any;
    let errorJson: string | undefined;
    try { errorJson = JSON.stringify(anyErr); } catch (_) {}
    const errorMessage = error instanceof Error 
      ? error.message 
      : (anyErr?.message || anyErr?.msg || errorJson || String(anyErr));
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorName = error instanceof Error ? error.name : typeof error;
    const details = anyErr?.details || anyErr?.hint || undefined;
    
    logger.error('🔴 Error in check-stuck-tracks', { 
      name: errorName,
      message: errorMessage,
      details,
      stack: errorStack,
      raw: anyErr
    });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      errorType: errorName,
      details,
      stack: errorStack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
