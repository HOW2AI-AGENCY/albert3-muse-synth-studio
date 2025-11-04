import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from '../_shared/logger.ts';

const baseHeaders = createCorsHeaders();

interface SunoEntry {
  id?: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  video_url?: string;
  duration?: number;
}

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = createCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const admin = createSupabaseAdminClient();

    const body = await req.json().catch(() => ({}));
    const trackId: string | undefined = body?.trackId;

    if (!trackId) {
      return new Response(JSON.stringify({ error: "trackId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Load track
    const { data: track, error: trackErr } = await admin
      .from("tracks")
      .select("id, user_id, title, audio_url, cover_url, lyrics, metadata")
      .eq("id", trackId)
      .maybeSingle();

    if (trackErr) {
      logger.error("[backfill] track select error", { error: trackErr });
      return new Response(JSON.stringify({ error: trackErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // 2) Existing versions
    const { data: existingVersions, error: versionsErr } = await admin
      .from("track_versions")
      .select("id, variant_index")
      .eq("parent_track_id", trackId);

    if (versionsErr) {
      logger.error("[backfill] versions select error", { error: versionsErr });
      return new Response(JSON.stringify({ error: versionsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingSet = new Set<number>();
    for (const v of existingVersions || []) {
      if (typeof v.variant_index === "number") existingSet.add(v.variant_index);
    }

    // 3) Determine candidates from metadata.suno_data
    const md = track.metadata || {};
    const sunoData = Array.isArray(md?.suno_data) ? (md.suno_data as SunoEntry[]) : [];

    if (!sunoData || sunoData.length <= 1) {
      return new Response(
        JSON.stringify({
          success: true,
          inserted: 0,
          skipped: 0,
          message: "No additional Suno versions found in metadata.suno_data",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let inserted = 0;
    let skipped = 0;
    const createdIds: string[] = [];

    // Start from index 1 since index 0 corresponds to main track (V1)
    for (let i = 1; i < sunoData.length; i++) {
      const entry = sunoData[i];
      const variantIndex = i; // 1-based beyond main => V2 -> idx 1, etc.

      if (existingSet.has(variantIndex)) {
        skipped++;
        continue;
      }

      const audioUrl = entry.audio_url || entry.stream_audio_url || null;
      if (!audioUrl) {
        skipped++;
        continue;
      }

      const payload: Record<string, unknown> = {
        parent_track_id: trackId,
        variant_index: variantIndex,
        is_preferred_variant: false,
        is_primary_variant: false,
        audio_url: audioUrl,
        cover_url: entry.image_url || track.cover_url || null,
        video_url: entry.video_url || null,
        duration: typeof entry.duration === "number" ? entry.duration : null,
        lyrics: track.lyrics || null,
        suno_id: entry.id || null,
        metadata: { source: "backfill-suno-versions", from_metadata: true },
      };

      const { data: insertedRow, error: insertErr } = await admin
        .from("track_versions")
        .insert(payload)
        .select("id")
        .maybeSingle();

      if (insertErr) {
        // If unique violation, mark skipped
        if ((insertErr as any).code === "23505") {
          skipped++;
          continue;
        }
        logger.error("[backfill] insert error", { error: insertErr, payload });
        return new Response(JSON.stringify({ error: insertErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (insertedRow?.id) createdIds.push(insertedRow.id);
      inserted++;
    }

    return new Response(
      JSON.stringify({ success: true, inserted, skipped, createdIds }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    logger.error("[backfill] unhandled", { error: e });
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...baseHeaders, "Content-Type": "application/json" } },
    );
  }
});

