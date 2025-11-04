import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { createSunoClient } from '../_shared/suno.ts';
import { logger } from '../_shared/logger.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('[migrate-versions] Starting migration for user:', { userId: user.id });

    // Получаем все completed Suno треки БЕЗ версий
    const { data: tracksWithoutVersions, error: tracksError } = await supabase
      .from('tracks')
      .select('id, title, suno_id, audio_url, cover_url, video_url, lyrics, duration, duration_seconds, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .eq('provider', 'suno')
      .is('suno_id', null).not()
      .order('created_at', { ascending: false });

    if (tracksError) {
      logger.error('[migrate-versions] Error fetching tracks:', { error: tracksError });
      throw tracksError;
    }

    if (!tracksWithoutVersions || tracksWithoutVersions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No tracks to migrate',
        migrated: 0,
        failed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Фильтруем треки, у которых ещё нет версий
    const tracksToMigrate = [];
    for (const track of tracksWithoutVersions) {
      const { count } = await supabase
        .from('track_versions')
        .select('*', { count: 'exact', head: true })
        .eq('parent_track_id', track.id);
      
      if (count === 0) {
        tracksToMigrate.push(track);
      }
    }

    logger.info(`[migrate-versions] Found ${tracksToMigrate.length} tracks without versions`);

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
    let migrated = 0;
    let failed = 0;
    const results = [];

    for (const track of tracksToMigrate) {
      try {
        logger.info(`[migrate-versions] Processing track ${track.id}`, { suno_id: track.suno_id });

        let versions = [];
        
        // Пытаемся получить данные из Suno API
        if (track.suno_id) {
          try {
            const sunoResponse = await sunoClient.queryTask(track.suno_id);
            
            if (sunoResponse?.status === 'SUCCESS' && sunoResponse.tasks) {
              versions = sunoResponse.tasks.map((task: any, index: number) => ({
                variant_index: index,
                audio_url: task.audioUrl || task.audio_url || null,
                cover_url: task.imageUrl || task.image_url || null,
                video_url: task.videoUrl || task.video_url || null,
                lyrics: task.lyrics || track.lyrics || null,
                duration: task.duration || track.duration_seconds || track.duration || null,
                suno_id: task.id || null,
                is_primary_variant: index === 0,
                is_preferred_variant: index === 0,
              }));
              
              logger.info(`[migrate-versions] Got ${versions.length} versions from Suno API`);
            }
          } catch (sunoError) {
            logger.warn(`[migrate-versions] Could not fetch from Suno API:`, { error: sunoError });
          }
        }

        // Если не удалось получить из Suno, создаём хотя бы version_0 из данных tracks
        if (versions.length === 0) {
          versions.push({
            variant_index: 0,
            audio_url: track.audio_url,
            cover_url: track.cover_url,
            video_url: track.video_url,
            lyrics: track.lyrics,
            duration: track.duration_seconds || track.duration,
            suno_id: track.suno_id,
            is_primary_variant: true,
            is_preferred_variant: true,
          });
          logger.info('[migrate-versions] Created fallback version_0 from track data');
        }

        // Сохраняем версии в БД
        for (const version of versions) {
          const { error: versionError } = await supabase
            .from('track_versions')
            .insert({
              parent_track_id: track.id,
              variant_index: version.variant_index,
              audio_url: version.audio_url,
              cover_url: version.cover_url,
              video_url: version.video_url,
              lyrics: version.lyrics,
              duration: version.duration,
              suno_id: version.suno_id,
              is_primary_variant: version.is_primary_variant,
              is_preferred_variant: version.is_preferred_variant,
              metadata: {
                migrated: true,
                migrated_at: new Date().toISOString(),
                source: versions.length > 1 ? 'suno_api' : 'track_data'
              }
            })
            .select()
            .single();

          if (versionError) {
            // Игнорируем ошибки дубликатов
            if (!versionError.message.includes('duplicate')) {
              logger.error('[migrate-versions] Error inserting version:', { error: versionError });
            }
          } else {
            logger.info(`[migrate-versions] ✓ Created version ${version.variant_index} for track ${track.id}`);
          }
        }

        migrated++;
        results.push({
          track_id: track.id,
          title: track.title,
          versions_created: versions.length,
          status: 'success'
        });

      } catch (error) {
        logger.error(`[migrate-versions] Error processing track ${track.id}:`, { error });
        failed++;
        results.push({
          track_id: track.id,
          title: track.title,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    logger.info(`[migrate-versions] Migration complete: ${migrated} migrated, ${failed} failed`);

    return new Response(JSON.stringify({
      success: true,
      message: `Migration completed: ${migrated} tracks migrated, ${failed} failed`,
      migrated,
      failed,
      total: tracksToMigrate.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('[migrate-versions] Fatal error:', { error });
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
