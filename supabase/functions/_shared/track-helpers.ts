import { logger } from './logger.ts';

export async function findOrCreateTrack(
  supabaseAdmin: any,
  userId: string,
  { trackId, title, prompt, lyrics, hasVocals, styleTags, requestMetadata, idempotencyKey }: {
    trackId?: string;
    title?: string;
    prompt?: string;
    lyrics?: string | null;
    hasVocals?: boolean;
    styleTags?: string[];
    requestMetadata: Record<string, unknown>;
    idempotencyKey?: string;
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
    
    await supabaseAdmin.from('tracks').update({ status: 'processing', provider: 'suno' }).eq('id', trackId);
    return { trackId, track: existingTrack };
  }

  const { data: newTrack, error: createError } = await supabaseAdmin
    .from('tracks')
    .insert({
      user_id: userId,
      title: title || 'Untitled Track',
      prompt: prompt || 'Untitled Track',
      provider: 'suno',
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
