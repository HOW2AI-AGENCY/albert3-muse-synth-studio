/**
 * Hook for replacing music sections
 * @version 1.0.0
 * @since 2025-11-02
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export interface ReplaceSectionParams {
  trackId: string;
  taskId: string;
  musicIndex: 0 | 1;
  prompt: string;
  tags: string;
  title: string;
  negativeTags?: string;
  infillStartS: number;
  infillEndS: number;
}

export interface TrackSectionReplacement {
  id: string;
  parent_track_id: string;
  version_id: string | null;
  replaced_start_s: number;
  replaced_end_s: number;
  prompt: string;
  tags: string;
  negative_tags: string | null;
  suno_task_id: string | null;
  replacement_audio_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface UseReplaceSectionReturn {
  replaceSection: (params: ReplaceSectionParams) => Promise<void>;
  isProcessing: boolean;
  error: Error | null;
  replacements: TrackSectionReplacement[];
  loadReplacements: (trackId: string) => Promise<void>;
}

export const useReplaceSection = (): UseReplaceSectionReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [replacements, setReplacements] = useState<TrackSectionReplacement[]>([]);
  const queryClient = useQueryClient();

  const loadReplacements = useCallback(async (trackId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('track_section_replacements')
        .select('*')
        .eq('parent_track_id', trackId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Type-safe mapping from database to interface
      const typedData: TrackSectionReplacement[] = (data || []).map(row => ({
        id: row.id,
        parent_track_id: row.parent_track_id,
        version_id: row.version_id,
        replaced_start_s: row.replaced_start_s,
        replaced_end_s: row.replaced_end_s,
        prompt: row.prompt,
        tags: row.tags,
        negative_tags: row.negative_tags,
        suno_task_id: row.suno_task_id,
        replacement_audio_url: row.replacement_audio_url,
        status: row.status as 'pending' | 'processing' | 'completed' | 'failed',
        error_message: row.error_message,
        metadata: (row.metadata as Record<string, any>) || {},
        created_at: row.created_at || new Date().toISOString(),
        updated_at: row.updated_at || new Date().toISOString(),
      }));

      setReplacements(typedData);
    } catch (err) {
      logger.error('Failed to load replacements', err as Error, 'useReplaceSection');
    }
  }, []);

  const replaceSection = useCallback(async (params: ReplaceSectionParams) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Validate parameters
      if (params.infillStartS < 0) {
        throw new Error('Start time must be >= 0');
      }

      if (params.infillEndS <= params.infillStartS) {
        throw new Error('End time must be greater than start time');
      }

      const sectionDuration = params.infillEndS - params.infillStartS;
      if (sectionDuration < 5) {
        throw new Error('Section must be at least 5 seconds');
      }

      if (sectionDuration > 30) {
        throw new Error('Section must be at most 30 seconds');
      }

      logger.info('Replacing music section', 'useReplaceSection', {
        trackId: params.trackId,
        start: params.infillStartS,
        end: params.infillEndS,
      });

      const { data, error: functionError } = await supabase.functions.invoke(
        'replace-section',
        {
          body: params,
        }
      );

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success) {
        toast.success('Section replacement started! This may take a few minutes.');
        
        // Invalidate track queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['tracks'] });
        queryClient.invalidateQueries({ queryKey: ['track', params.trackId] });
        
        // Reload replacements
        await loadReplacements(params.trackId);
      } else {
        throw new Error('Invalid response from replace section API');
      }
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to replace section', error, 'useReplaceSection');
      setError(error);
      toast.error(error.message || 'Failed to replace section');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [queryClient, loadReplacements]);

  return {
    replaceSection,
    isProcessing,
    error,
    replacements,
    loadReplacements,
  };
};
