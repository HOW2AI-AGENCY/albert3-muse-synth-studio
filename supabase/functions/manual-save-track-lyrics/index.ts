/**
 * Manual Save Track Lyrics to Saved Lyrics
 * 
 * For existing tracks that don't have auto-saved lyrics,
 * this function allows manual saving to the lyrics library
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { autoSaveLyrics } from "../_shared/auto-save-lyrics.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders()
};

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      logger.error('Authentication failed', { error: userError ?? undefined });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request
    const { trackId } = await req.json();

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Missing trackId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get track data
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, title, lyrics, prompt, style_tags, user_id, genre, mood')
      .eq('id', trackId)
      .eq('user_id', user.id) // Ensure user owns the track
      .single();

    if (trackError || !track) {
      logger.error('Track not found or access denied', { trackId, error: trackError });
      return new Response(
        JSON.stringify({ error: 'Track not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!track.lyrics) {
      return new Response(
        JSON.stringify({ error: 'Track has no lyrics to save' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Save lyrics
    await autoSaveLyrics(supabase, {
      trackId: track.id,
      userId: track.user_id,
      title: track.title,
      lyrics: track.lyrics,
      prompt: track.prompt || undefined,
      genre: track.genre || undefined,
      mood: track.mood || undefined,
      tags: track.style_tags || [],
    });

    logger.info('✅ Track lyrics manually saved', { trackId, userId: user.id });

    return new Response(
      JSON.stringify({ success: true, message: 'Lyrics saved successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Manual save lyrics error', { error });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
