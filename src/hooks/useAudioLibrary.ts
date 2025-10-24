/**
 * Hook for managing audio library
 * Sprint 30: Lyrics & Audio Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface AudioLibraryItem {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  duration_seconds: number | null;
  source_type: 'upload' | 'recording' | 'generated';
  source_metadata: Record<string, any>;
  analysis_status: 'pending' | 'processing' | 'completed' | 'failed';
  analysis_data: {
    tempo?: number;
    key?: string;
    genre?: string;
    mood?: string;
    instruments?: string[];
  } | null;
  tags: string[];
  is_favorite: boolean;
  folder: string | null;
  description: string | null;
  usage_count: number;
  last_used_at: string | null;
  recognized_song_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveAudioParams {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  durationSeconds?: number;
  sourceType: 'upload' | 'recording' | 'generated';
  sourceMetadata?: Record<string, any>;
  tags?: string[];
  folder?: string;
  description?: string;
}

export function useAudioLibrary(filters?: {
  sourceType?: string;
  folder?: string;
  favorite?: boolean;
  limit?: number;
  offset?: number;
}) {
  const queryClient = useQueryClient();

  // Fetch audio library
  const { data, isLoading, error } = useQuery({
    queryKey: ['audio-library', filters],
    queryFn: async () => {
      let query = supabase
        .from('audio_library')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (filters?.sourceType) {
        query = query.eq('source_type', filters.sourceType);
      }
      if (filters?.folder) {
        query = query.eq('folder', filters.folder);
      }
      if (filters?.favorite) {
        query = query.eq('is_favorite', true);
      }
      if (filters?.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      return { items: data as AudioLibraryItem[], count: count || 0 };
    },
  });

  // Save audio to library
  const saveAudio = useMutation({
    mutationFn: async (params: SaveAudioParams) => {
      const { data, error } = await supabase.functions.invoke('audio-library', {
        method: 'POST',
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
      toast.success('Аудио сохранено в библиотеку');
      logger.info('Audio saved to library', 'useAudioLibrary');
    },
    onError: (error: Error) => {
      toast.error('Не удалось сохранить аудио');
      logger.error('Failed to save audio', error, 'useAudioLibrary');
    },
  });

  // Update audio
  const updateAudio = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<AudioLibraryItem> 
    }) => {
      const { data, error } = await supabase
        .from('audio_library')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
      toast.success('Аудио обновлено');
    },
    onError: (error: Error) => {
      toast.error('Не удалось обновить аудио');
      logger.error('Failed to update audio', error, 'useAudioLibrary');
    },
  });

  // Delete audio
  const deleteAudio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('audio_library')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
      toast.success('Аудио удалено');
    },
    onError: (error: Error) => {
      toast.error('Не удалось удалить аудио');
      logger.error('Failed to delete audio', error, 'useAudioLibrary');
    },
  });

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('audio_library')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-library'] });
    },
  });

  // Track usage
  const trackUsage = useMutation({
    mutationFn: async (id: string) => {
      // Get current usage count
      const { data: current } = await supabase
        .from('audio_library')
        .select('usage_count')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('audio_library')
        .update({
          usage_count: (current?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
  });

  return {
    items: data?.items || [],
    count: data?.count || 0,
    isLoading,
    error,
    saveAudio,
    updateAudio,
    deleteAudio,
    toggleFavorite,
    trackUsage,
  };
}