/**
 * Auto-save Lyrics Helper
 * Automatically saves track lyrics to saved_lyrics table
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logger } from "./logger.ts";

export interface AutoSaveLyricsParams {
  trackId: string;
  userId: string;
  title: string;
  lyrics: string;
  prompt?: string;
  genre?: string;
  mood?: string;
  tags?: string[];
}

/**
 * Automatically save lyrics from a completed track to saved_lyrics
 */
export async function autoSaveLyrics(
  supabase: SupabaseClient,
  params: AutoSaveLyricsParams
): Promise<void> {
  const { trackId, userId, title, lyrics, prompt, genre, mood, tags } = params;

  // Skip if no lyrics
  if (!lyrics || lyrics.trim().length === 0) {
    logger.info('⏭️ Skipping auto-save: no lyrics', { trackId });
    return;
  }

  try {
    // Check if lyrics already saved for this track
    const { data: existing } = await supabase
      .from('saved_lyrics')
      .select('id')
      .eq('user_id', userId)
      .eq('content', lyrics)
      .maybeSingle();

    if (existing) {
      logger.info('ℹ️ Lyrics already saved', { trackId, lyricsId: existing.id });
      return;
    }

    // Save lyrics
    const { data, error } = await supabase
      .from('saved_lyrics')
      .insert({
        user_id: userId,
        title: title || 'Untitled Lyrics',
        content: lyrics,
        prompt: prompt || null,
        genre: genre || null,
        mood: mood || null,
        tags: tags || [],
        folder: null,
        is_favorite: false,
        usage_count: 1,
        last_used_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      logger.error('❌ Failed to auto-save lyrics', { error, trackId });
      return;
    }

    logger.info('✅ Lyrics auto-saved', {
      trackId,
      lyricsId: data.id,
      titlePreview: title.substring(0, 30),
      lyricsLength: lyrics.length,
    });
  } catch (error) {
    logger.error('❌ Auto-save lyrics error', { error, trackId });
  }
}
