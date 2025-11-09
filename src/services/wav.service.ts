import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface WavJob {
  id: string;
  track_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  wav_url?: string | null;
  error_message?: string | null;
  created_at?: string;
  completed_at?: string | null;
}

/**
 * Возвращает последнюю запись wav_jobs для указанного трека.
 * Используется для проверки готовности WAV перед скачиванием.
 */
export async function getLatestWavJob(trackId: string): Promise<WavJob | null> {
  try {
    const { data, error } = await supabase
      .from('wav_jobs')
      .select('*')
      .eq('track_id', trackId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return (data as WavJob) ?? null;
  } catch (err) {
    logger.error('Failed to fetch latest wav_job', err instanceof Error ? err : new Error(String(err)), 'wav.service', { trackId });
    return null;
  }
}