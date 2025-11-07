/**
 * Edge Function: Refresh Track Audio URLs
 * SPRINT 28: PLAYER-FIX-001
 *
 * Регенерирует signed URLs для треков с истекшим временем действия
 * TTL: 7 дней для production, 1 час для test режима
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { logger } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshRequest {
  trackId: string;
  mode?: 'production' | 'test';
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

    const { trackId, mode = 'production' }: RefreshRequest = await req.json();

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'trackId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Refreshing URLs for track', { endpoint: 'refresh-track-audio', trackId, mode });

    // Получаем трек из БД (используем maybeSingle для корректной обработки отсутствия данных)
    const { data: track, error: fetchError } = await supabaseClient
      .from('tracks')
      .select('id, audio_url, cover_url, video_url')
      .eq('id', trackId)
      .maybeSingle();

    if (fetchError) {
      logger.error('Database error', fetchError instanceof Error ? fetchError : new Error(String(fetchError)), 'refresh-track-audio');
      return new Response(
        JSON.stringify({ error: 'Database error', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!track) {
      logger.warn('Track not found', { endpoint: 'refresh-track-audio', trackId });
      return new Response(
        JSON.stringify({ error: 'Track not found', trackId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Определяем TTL в зависимости от режима
    const TTL_SECONDS = mode === 'production' ? 7 * 24 * 60 * 60 : 60 * 60; // 7 дней или 1 час

    // Регенерируем signed URLs
    const refreshedUrls: Record<string, string | null> = {
      audio_url: null,
      cover_url: null,
      video_url: null,
    };

    for (const [key, url] of Object.entries(track)) {
      if (!url || typeof url !== 'string' || !url.includes('supabase')) continue;

      try {
        const urlObj = new URL(url);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/[^/]+\/([^/]+)\/(.+)/);
        
        if (pathMatch) {
          const bucketName = pathMatch[1];
          const filePath = pathMatch[2];

          const { data: signedData, error: signError } = await supabaseClient
            .storage
            .from(bucketName)
            .createSignedUrl(filePath, TTL_SECONDS);

          if (!signError && signedData?.signedUrl) {
            refreshedUrls[key] = signedData.signedUrl;
            logger.info('Refreshed URL', { endpoint: 'refresh-track-audio', key, filePath, ttl: TTL_SECONDS });
          } else {
            logger.error('Failed to refresh URL', signError instanceof Error ? signError : new Error(String(signError)), 'refresh-track-audio', { key });
          }
        }
      } catch (error) {
        logger.error('Error parsing URL', error instanceof Error ? error : new Error(String(error)), 'refresh-track-audio', { key });
      }
    }

    // Обновляем URLs в БД
    const updatePayload: Record<string, string | null> = {};
    if (refreshedUrls.audio_url) updatePayload.audio_url = refreshedUrls.audio_url;
    if (refreshedUrls.cover_url) updatePayload.cover_url = refreshedUrls.cover_url;
    if (refreshedUrls.video_url) updatePayload.video_url = refreshedUrls.video_url;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseClient
        .from('tracks')
        .update(updatePayload)
        .eq('id', trackId);

      if (updateError) {
        logger.error('Failed to update track', updateError instanceof Error ? updateError : new Error(String(updateError)), 'refresh-track-audio');
        return new Response(
          JSON.stringify({ error: 'Failed to update track URLs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logger.info('Successfully refreshed URLs', { endpoint: 'refresh-track-audio', count: Object.keys(updatePayload).length });
    }

    return new Response(
      JSON.stringify({
        success: true,
        trackId,
        refreshed: updatePayload,
        ttl: TTL_SECONDS,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Unexpected error', error instanceof Error ? error : new Error(String(error)), 'refresh-track-audio');
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
