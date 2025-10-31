/**
 * Restore all generated Mureka tracks manually by querying provider API
 * - Scans pending/processing Mureka tracks
 * - Queries Mureka with corrected `task_id` usage
 * - Updates main track with first clip (audio/cover/video/duration/title)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { createMurekaClient } from "../_shared/mureka.ts";

const corsHeaders = {
  ...createCorsHeaders(),
};

type TrackRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  audio_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  created_at: string;
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get('limit') ?? '500');

    const supabaseAdmin = createSupabaseAdminClient();
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const { data: tracks, error: listError } = await supabaseAdmin
      .from('tracks')
      .select('id, user_id, title, status, metadata, audio_url, cover_url, video_url, created_at')
      .eq('provider', 'mureka')
      .in('status', ['pending', 'processing', 'failed'])
      .is('audio_url', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (listError) throw listError;

    logger.info('🔎 Restore Mureka: scanning candidates', { count: tracks?.length ?? 0, limit });

    if (!tracks || tracks.length === 0) {
      return new Response(JSON.stringify({ success: true, restored: 0, message: 'No candidate tracks found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mureka = createMurekaClient({ apiKey: murekaApiKey });

    const results: Array<{ trackId: string; taskId?: string; updated: boolean; reason?: string; audio_url?: string | null }> = [];

    for (const t of tracks as TrackRow[]) {
      // Skip if already has audio_url (defensive)
      if (t.audio_url) {
        results.push({ trackId: t.id, updated: false, reason: 'already_has_audio' });
        continue;
      }

      const md = t.metadata || {};
      const taskId = (md as any).mureka_task_id || (md as any).task_id || (md as any).murekaTaskId;
      if (!taskId) {
        results.push({ trackId: t.id, updated: false, reason: 'no_task_id' });
        continue;
      }

      try {
        const q = await mureka.queryTask(String(taskId));
        const rawStatus = (q.data as any)?.status;
        const clips = q.data?.clips;

        if (q.code === 200 && clips && clips.length > 0) {
          const clip = clips[0] as any;
          const updatePayload: Record<string, unknown> = {
            status: 'completed',
            audio_url: clip.audio_url ?? null,
            cover_url: clip.image_url ?? null,
            video_url: clip.video_url ?? null,
            duration_seconds: clip.duration ?? 0,
            title: clip.title || t.title || 'Generated Track',
            metadata: {
              ...(t.metadata || {}),
              restored_via: 'restore-mureka-tracks',
              restored_at: new Date().toISOString(),
              mureka_query_status: rawStatus ?? 'SUCCESS',
            },
          };

          const { error: upErr } = await supabaseAdmin
            .from('tracks')
            .update(updatePayload)
            .eq('id', t.id);

          if (upErr) throw upErr;

          results.push({ trackId: t.id, taskId: String(taskId), updated: true, audio_url: clip.audio_url });
        } else {
          results.push({ trackId: t.id, taskId: String(taskId), updated: false, reason: rawStatus || `code_${q.code}` });
        }
      } catch (e) {
        logger.error('🔴 Restore Mureka: query/update failed', { trackId: t.id, taskId, error: e });
        results.push({ trackId: t.id, taskId: String(taskId), updated: false, reason: 'exception' });
      }
    }

    const restored = results.filter(r => r.updated).length;
    return new Response(
      JSON.stringify({ success: true, restored, total: results.length, results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Restore Mureka error', { error: msg });
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
