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
      .select('id, title, user_id, created_at, metadata, status');

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
            const sunoTrack = successfulTracks[0];
            logger.info('✅ Found completed track', { 
              trackId: track.id, 
              audioUrl: sunoTrack.audioUrl?.substring(0, 50) 
            });
            
            // Полная синхронизация трека со всеми метаданными
            await supabaseAdmin
              .from('tracks')
              .update({
                status: 'completed',
                audio_url: sunoTrack.audioUrl,
                video_url: sunoTrack.streamAudioUrl || null,
                cover_url: sunoTrack.imageUrl || null,
                lyrics: sunoTrack.prompt || null,
                duration: sunoTrack.duration ? Math.round(sunoTrack.duration) : null,
                model_name: sunoTrack.modelName || null,
                genre: sunoTrack.tags || null,
                style_tags: sunoTrack.tags ? sunoTrack.tags.split(',').map((t: string) => t.trim()) : null,
                suno_id: sunoTrack.id || null,
                created_at_suno: sunoTrack.createTime ? new Date(sunoTrack.createTime).toISOString() : null,
                metadata: {
                  ...metadata,
                  sync_check_at: new Date().toISOString(),
                  sync_found_completed: true,
                  suno_data: queryResult.tasks,
                }
              })
              .eq('id', track.id);
            
            logger.info('✅ Track fully synced', { 
              trackId: track.id,
              title: sunoTrack.title || track.title,
              duration: sunoTrack.duration,
              hasPrompt: !!sunoTrack.prompt
            });
            
            results.push({ 
              trackId: track.id, 
              action: 'synced_completed',
              audioUrl: sunoTrack.audioUrl,
              hasPrompt: !!sunoTrack.prompt
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
