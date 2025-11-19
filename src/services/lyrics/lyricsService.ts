import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { logger } from '@/utils/logger';

export interface SaveLyricsResult {
  success: boolean;
  trackId: string;
  title: string;
  message: string;
}

export interface SaveLyricsOptions {
  trackId?: string;
  generateTitle?: boolean;
}

/**
 * Saves lyrics to the database
 * - If trackId is provided, updates existing track
 * - If trackId is not provided, creates new draft track with AI-generated title
 */
export async function saveLyrics(
  lyrics: string,
  options: SaveLyricsOptions = {}
): Promise<SaveLyricsResult> {
  const { trackId, generateTitle = true } = options;

  try {
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      if (authError) logger.error('User not authenticated', authError);
      throw new Error('Требуется авторизация');
    }

    // Update existing track
    if (trackId) {
      const { data: existingTrack, error: fetchError } = await supabase
        .from('tracks')
        .select('title, user_id')
        .eq('id', trackId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !existingTrack) {
        logger.error('Track not found or unauthorized', fetchError);
        throw new Error('Трек не найден или нет доступа');
      }

      const { error: updateError } = await supabase
        .from('tracks')
        .update({ 
          lyrics,
          updated_at: new Date().toISOString()
        })
        .eq('id', trackId);

      if (updateError) {
        logger.error('Failed to update track lyrics', updateError);
        throw new Error('Не удалось обновить лирику');
      }

      logger.info('Lyrics updated successfully', existingTrack.title);

      return {
        success: true,
        trackId,
        title: existingTrack.title,
        message: `Лирика обновлена: ${existingTrack.title}`
      };
    }

    // Create new draft track
    let title = 'Новый трек';
    
    if (generateTitle) {
      // Generate title using AI
      try {
        const { data: titleData, error: titleError } = await SupabaseFunctions.invoke('generate-track-title', {
          body: { lyrics }
        });

        if (titleError) {
          logger.warn('Failed to generate title, using default', titleError);
        } else if (titleData?.title) {
          title = titleData.title;
        }
      } catch (titleError) {
        logger.warn('Error generating title, using default');
      }
    }

    // Extract prompt from lyrics (first 100 chars without tags)
    const prompt = lyrics
      .replace(/\[.*?\]/g, '')
      .trim()
      .slice(0, 100);

    const { data: newTrack, error: createError } = await supabase
      .from('tracks')
      .insert({
        user_id: user.id,
        title,
        lyrics,
        prompt: prompt || 'Текст песни',
        status: 'draft',
        provider: 'manual',
        has_vocals: true,
      })
      .select('id, title')
      .single();

    if (createError) {
      logger.error('Failed to create draft track', createError);
      throw new Error('Не удалось создать трек');
    }

    logger.info('Draft track created successfully', newTrack.title);

    return {
      success: true,
      trackId: newTrack.id,
      title: newTrack.title,
      message: `Лирика сохранена: ${newTrack.title}`
    };

  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error in saveLyrics', error);
    }
    throw error;
  }
}
