/**
 * Edge Function: Refresh Track Audio URLs
 * SPRINT 28: PLAYER-FIX-001
 * 
 * Регенерирует signed URLs для треков с истекшим временем действия
 * TTL: 7 дней для production, 1 час для test режима
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    console.log(`[refresh-track-audio] Refreshing URLs for track: ${trackId}, mode: ${mode}`);

    // Получаем трек из БД
    const { data: track, error: fetchError } = await supabaseClient
      .from('tracks')
      .select('id, audio_url, cover_url, video_url')
      .eq('id', trackId)
      .single();

    if (fetchError || !track) {
      console.error('[refresh-track-audio] Track not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
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
            console.log(`[refresh-track-audio] Refreshed ${key}: ${filePath} (TTL: ${TTL_SECONDS}s)`);
          } else {
            console.error(`[refresh-track-audio] Failed to refresh ${key}:`, signError);
          }
        }
      } catch (error) {
        console.error(`[refresh-track-audio] Error parsing ${key}:`, error);
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
        console.error('[refresh-track-audio] Failed to update track:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update track URLs' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[refresh-track-audio] Successfully refreshed ${Object.keys(updatePayload).length} URLs`);
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
    console.error('[refresh-track-audio] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
