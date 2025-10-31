/**
 * Edge Function: cleanup-old-tracks
 * 
 * Автоматически удаляет:
 * - Failed треки старше 7 дней
 * - Pending треки старше 24 часов (stuck)
 * - Processing треки старше 3 часов (timeout)
 * 
 * Вызывается через cron job каждый день в 3:00 UTC
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { createCorsHeaders } from "../_shared/cors.ts";

interface CleanupStats {
  deletedFailed: number;
  deletedStuck: number;
  deletedTimeout: number;
  totalDeleted: number;
  errors: number;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    logger.info('🧹 [CLEANUP] Starting track cleanup');

    const supabase = createSupabaseAdminClient();

    // Расчет дат отсечения
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const stats: CleanupStats = {
      deletedFailed: 0,
      deletedStuck: 0,
      deletedTimeout: 0,
      totalDeleted: 0,
      errors: 0,
    };

    // ============= 1. Удаление Failed треков (старше 7 дней) =============
    try {
      logger.info('[CLEANUP] Step 1: Deleting old failed tracks', {
        cutoffDate: sevenDaysAgo.toISOString(),
      });

      const { data: failedTracks, error: failedError } = await supabase
        .from('tracks')
        .select('id, title, created_at, status')
        .eq('status', 'failed')
        .lt('created_at', sevenDaysAgo.toISOString());

      if (failedError) {
        logger.error('Failed to fetch failed tracks', { error: failedError });
        stats.errors++;
      } else if (failedTracks && failedTracks.length > 0) {
        const trackIds = failedTracks.map(t => t.id);

        logger.info('[CLEANUP] Found failed tracks to delete', {
          count: failedTracks.length,
          trackIds: trackIds.slice(0, 5), // First 5 IDs
        });

        // Удаляем треки (cascade удалит связанные версии, стемы, лайки)
        const { error: deleteError } = await supabase
          .from('tracks')
          .delete()
          .in('id', trackIds);

        if (deleteError) {
          logger.error('Failed to delete failed tracks', { error: deleteError });
          stats.errors++;
        } else {
          stats.deletedFailed = failedTracks.length;
          logger.info('[CLEANUP] ✅ Deleted failed tracks', {
            count: failedTracks.length,
          });
        }
      } else {
        logger.info('[CLEANUP] No failed tracks to delete');
      }
    } catch (error) {
      logger.error('Error in failed tracks cleanup', { error });
      stats.errors++;
    }

    // ============= 2. Удаление Stuck Pending треков (старше 24 часов) =============
    try {
      logger.info('[CLEANUP] Step 2: Deleting stuck pending tracks', {
        cutoffDate: oneDayAgo.toISOString(),
      });

      const { data: stuckTracks, error: stuckError } = await supabase
        .from('tracks')
        .select('id, title, created_at, status')
        .eq('status', 'pending')
        .lt('created_at', oneDayAgo.toISOString());

      if (stuckError) {
        logger.error('Failed to fetch stuck tracks', { error: stuckError });
        stats.errors++;
      } else if (stuckTracks && stuckTracks.length > 0) {
        const trackIds = stuckTracks.map(t => t.id);

        logger.info('[CLEANUP] Found stuck pending tracks to delete', {
          count: stuckTracks.length,
          trackIds: trackIds.slice(0, 5),
        });

        // Сначала помечаем как failed для истории
        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            status: 'failed',
            error_message: 'Stuck in pending status for >24h, auto-cleaned',
          })
          .in('id', trackIds);

        if (updateError) {
          logger.error('Failed to mark stuck tracks as failed', { error: updateError });
          stats.errors++;
        } else {
          // Затем удаляем
          const { error: deleteError } = await supabase
            .from('tracks')
            .delete()
            .in('id', trackIds);

          if (deleteError) {
            logger.error('Failed to delete stuck tracks', { error: deleteError });
            stats.errors++;
          } else {
            stats.deletedStuck = stuckTracks.length;
            logger.info('[CLEANUP] ✅ Deleted stuck pending tracks', {
              count: stuckTracks.length,
            });
          }
        }
      } else {
        logger.info('[CLEANUP] No stuck pending tracks to delete');
      }
    } catch (error) {
      logger.error('Error in stuck tracks cleanup', { error });
      stats.errors++;
    }

    // ============= 3. Удаление Timeout Processing треков (старше 3 часов) =============
    try {
      logger.info('[CLEANUP] Step 3: Deleting timeout processing tracks', {
        cutoffDate: threeHoursAgo.toISOString(),
      });

      const { data: timeoutTracks, error: timeoutError } = await supabase
        .from('tracks')
        .select('id, title, created_at, status')
        .eq('status', 'processing')
        .lt('created_at', threeHoursAgo.toISOString());

      if (timeoutError) {
        logger.error('Failed to fetch timeout tracks', { error: timeoutError });
        stats.errors++;
      } else if (timeoutTracks && timeoutTracks.length > 0) {
        const trackIds = timeoutTracks.map(t => t.id);

        logger.info('[CLEANUP] Found timeout processing tracks to delete', {
          count: timeoutTracks.length,
          trackIds: trackIds.slice(0, 5),
        });

        // Помечаем как failed
        const { error: updateError } = await supabase
          .from('tracks')
          .update({
            status: 'failed',
            error_message: 'Processing timeout (>3h), auto-cleaned',
          })
          .in('id', trackIds);

        if (updateError) {
          logger.error('Failed to mark timeout tracks as failed', { error: updateError });
          stats.errors++;
        } else {
          // Удаляем
          const { error: deleteError } = await supabase
            .from('tracks')
            .delete()
            .in('id', trackIds);

          if (deleteError) {
            logger.error('Failed to delete timeout tracks', { error: deleteError });
            stats.errors++;
          } else {
            stats.deletedTimeout = timeoutTracks.length;
            logger.info('[CLEANUP] ✅ Deleted timeout processing tracks', {
              count: timeoutTracks.length,
            });
          }
        }
      } else {
        logger.info('[CLEANUP] No timeout processing tracks to delete');
      }
    } catch (error) {
      logger.error('Error in timeout tracks cleanup', { error });
      stats.errors++;
    }

    // ============= Финальная статистика =============
    stats.totalDeleted = stats.deletedFailed + stats.deletedStuck + stats.deletedTimeout;
    const duration = Date.now() - startTime;

    logger.info('✅ [CLEANUP] Track cleanup completed', {
      duration: `${duration}ms`,
      stats,
    });

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        duration,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('❌ [CLEANUP] Fatal error during cleanup', { error, duration: `${duration}ms` });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
