import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { fetchSunoBalance } from "../_shared/suno-balance.ts";
import { logger } from "../_shared/logger.ts";

/**
 * ✅ PHASE 3.3: Monitoring для Suno API
 * Проверяет зависшие треки и низкий баланс Suno
 */

const corsHeaders = createCorsHeaders();

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const alerts: string[] = [];

    // ✅ Проверить processing треки старше 10 минут
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    
    const { data: stuckTracks, error: stuckError } = await supabase
      .from('tracks')
      .select('id, title, created_at, user_id')
      .eq('status', 'processing')
      .lt('created_at', tenMinutesAgo);

    if (stuckError) {
      logger.error('Failed to check stuck tracks', { error: stuckError });
    } else if (stuckTracks && stuckTracks.length > 0) {
      const alertMessage = `${stuckTracks.length} треков зависли в processing более 10 минут`;
      alerts.push(alertMessage);
      logger.warn(`⚠️ ${alertMessage}`, { count: stuckTracks.length });

      // ✅ Отправить уведомление админу
      const { data: adminRole } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminRole) {
        await supabase
          .from('notifications')
          .insert({
            user_id: adminRole.user_id,
            type: 'error',
            title: '⚠️ Зависшие треки',
            message: `${stuckTracks.length} треков в processing более 10 минут. Проверьте Suno API health.`,
            link: '/workspace/admin'
          });
      }
    }

    // ✅ Проверить баланс Suno
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (SUNO_API_KEY) {
      const balanceResult = await fetchSunoBalance({ apiKey: SUNO_API_KEY });
      
      if (balanceResult.success) {
        const balance = balanceResult.balance;
        logger.info('💳 Suno balance check', { balance });

        // ✅ Low balance alert (< 100 credits)
        if (balance < 100) {
          const alertMessage = `Низкий баланс Suno: ${balance} кредитов`;
          alerts.push(alertMessage);
          logger.warn(`⚠️ ${alertMessage}`);

          // Отправить уведомление админу
          const { data: adminRole } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('role', 'admin')
            .limit(1)
            .maybeSingle();

          if (adminRole) {
            await supabase
              .from('notifications')
              .insert({
                user_id: adminRole.user_id,
                type: 'error',
                title: '💳 Низкий баланс Suno',
                message: `Осталось ${balance} кредитов. Пополните баланс.`,
                link: '/workspace/admin'
              });
          }
        }

        // ✅ Critical balance alert (< 10 credits)
        if (balance < 10) {
          logger.error('🔴 Critical: Suno balance very low', { balance });
        }

        return new Response(JSON.stringify({ 
          ok: true,
          stuckTracks: stuckTracks?.length ?? 0,
          balance,
          alerts
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        logger.error('Failed to fetch Suno balance', { error: balanceResult.error });
        return new Response(JSON.stringify({ 
          ok: false,
          error: 'balance_check_failed',
          stuckTracks: stuckTracks?.length ?? 0,
          alerts
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ 
      ok: true,
      stuckTracks: stuckTracks?.length ?? 0,
      alerts,
      message: 'SUNO_API_KEY not configured'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Monitor Suno health error', { error: error instanceof Error ? error : new Error(String(error)) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
