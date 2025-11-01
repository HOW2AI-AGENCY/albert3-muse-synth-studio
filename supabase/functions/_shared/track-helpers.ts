import { logger } from './logger.ts';

export async function findOrCreateTrack(
  supabaseAdmin: any,
  userId: string,
  { trackId, title, prompt, lyrics, hasVocals, styleTags, requestMetadata, idempotencyKey, provider }: {
    trackId?: string;
    title?: string;
    prompt?: string;
    lyrics?: string | null;
    hasVocals?: boolean;
    styleTags?: string[];
    requestMetadata: Record<string, unknown>;
    idempotencyKey?: string;
    provider?: string;
  }
): Promise<{ trackId: string; track: any }> {
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
    
    await supabaseAdmin.from('tracks').update({ 
      status: 'processing', 
      provider: provider || 'suno' 
    }).eq('id', trackId);
    return { trackId, track: existingTrack };
  }

  // ✅ Generate AI title if not provided (with fallback)
  const generateTitle = async () => {
    if (title) return title;
    
    // Try AI title generation for Mureka
    if (provider === 'mureka') {
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
    
    // Fallback: Extract from prompt
    if (prompt) {
      const cleaned = prompt
        .replace(/[^\w\s-]/gi, '')
        .trim()
        .slice(0, 50);
      
      if (cleaned) return cleaned;
    }
    
    // Final fallback with timestamp
    const timestamp = new Date().toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    return `Трек ${timestamp}`;
  };

  const generatedTitle = await generateTitle();

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
      metadata: requestMetadata,
      idempotency_key: idempotencyKey,
    })
    .select('*')
    .single();

  if (createError) {
    logger.error('🔴 Error creating track', { error: createError });
    throw createError;
  }

  return { trackId: newTrack.id, track: newTrack };
}
