/**
 * Track Helpers - Database operations for track management
 * 
 * Provides utilities for creating and finding tracks in the database
 * Used by generation handlers to maintain track records during music generation
 */

import { logger } from './logger.ts';
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Find existing track or create a new one
 * Handles both track updates (when trackId provided) and new track creation
 * 
 * @param supabaseAdmin - Supabase client with admin privileges
 * @param userId - User ID for track ownership
 * @param params - Track creation parameters
 * @returns Object containing trackId and full track data
 */
export async function findOrCreateTrack(
  supabaseAdmin: SupabaseClient<any>, // Changed from SupabaseClient<Database>
  userId: string,
  { trackId, title, prompt, lyrics, hasVocals, styleTags, genre, mood, requestMetadata, idempotencyKey, provider, projectId }: {
    trackId?: string;
    title?: string;
    prompt?: string;
    lyrics?: string | null;
    hasVocals?: boolean;
    styleTags?: string[];
    genre?: string;
    mood?: string;
    requestMetadata: Record<string, unknown>;
    idempotencyKey?: string;
    provider?: string;
    projectId?: string;
  }
): Promise<{ trackId: string; track: any }> { // Changed from Track type
  // ============= EXISTING TRACK FLOW =============
  // If trackId provided, find and update the existing track
  if (trackId) {
    const { data: existingTrack, error } = await supabaseAdmin
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !existingTrack) {
      logger.error('🔴 Track not found or unauthorized', { error: error ?? undefined, trackId });
      throw new Error('Track not found or unauthorized');
    }
    
    // Update status to processing and set provider
    await supabaseAdmin.from('tracks').update({ 
      status: 'processing', 
      provider: provider || 'suno' 
    }).eq('id', trackId);
    
    return { trackId, track: existingTrack };
  }

  // ============= NEW TRACK FLOW =============

  /**
   * Generate a meaningful title for the track
   * Priority: 1) User-provided title, 2) AI-generated title, 3) Prompt-based title, 4) Fallback
   */
  const generateTitle = async () => {
    // Use provided title if available
    if (title) return title;
    
    // Try AI title generation for supported providers
    if (provider === 'mureka' || provider === 'suno') {
      try {
        const { data: titleData, error: titleError } = await supabaseAdmin.functions.invoke('generate-track-title', {
          body: {
            prompt: prompt || 'Untitled Track',
            lyrics: lyrics || undefined,
            styleTags: styleTags || undefined,
            provider: 'mureka'
          }
        });

        if (!titleError && titleData?.title) {
          logger.info('✅ [TRACK-HELPERS] AI-generated title', { title: titleData.title });
          return titleData.title;
        }
      } catch (error) {
        logger.warn('⚠️ [TRACK-HELPERS] Failed to generate AI title, using fallback', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }
    
    // Extract title from prompt if no AI generation
    if (prompt) {
      const cleaned = prompt
        .replace(/\b(music|track|song|create|generate|трек|музыка|песня|создай|сгенерируй)\b/gi, '')
        .replace(/[^\wА-Яа-яЁё\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 60);
      
      if (cleaned.length > 3) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }
    
    // Fallback: Generate title from genre and timestamp
    const timestamp = new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const genre = styleTags && styleTags.length > 0 
      ? styleTags[0].charAt(0).toUpperCase() + styleTags[0].slice(1)
      : 'Music';
    
    return `${genre} ${timestamp}`;
  };

  const generatedTitle = await generateTitle();

  // ============= CREATE NEW TRACK RECORD =============
  const { data: newTrack, error: createError } = await supabaseAdmin
    .from('tracks')
    .insert({
      user_id: userId,
      title: generatedTitle,
      prompt: prompt || 'Untitled Track',
      provider: provider || 'suno',
      status: 'processing',
      lyrics: lyrics ?? null,
      has_vocals: hasVocals ?? null,
      style_tags: styleTags ?? null,
      genre: genre ?? null,
      mood: mood ?? null,
      metadata: requestMetadata,
      idempotency_key: idempotencyKey,
      project_id: projectId ?? null,
    })
    .select('*')
    .single();

  if (createError) {
    logger.error('🔴 Error creating track', { error: createError });
    throw createError;
  }

  return { trackId: newTrack.id, track: newTrack };
}
