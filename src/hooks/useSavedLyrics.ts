/**
 * Hook for managing saved lyrics
 * Sprint 30: Lyrics & Audio Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export interface SavedLyrics {
  id: string;
  user_id: string;
  job_id: string | null;
  variant_id: string | null;
  title: string;
  content: string;
  prompt: string | null;
  tags: string[];
  genre: string | null;
  mood: string | null;
  language: string;
  is_favorite: boolean;
  folder: string | null;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveLyricsParams {
  jobId?: string;
  variantId?: string;
  title: string;
  content?: string;
  tags?: string[];
  folder?: string;
}

export function useSavedLyrics(filters?: {
  favorite?: boolean;
  folder?: string;
  search?: string;
}) {
  const queryClient = useQueryClient();

  // Fetch saved lyrics
  const { data: lyrics, isLoading, error } = useQuery({
    queryKey: ['saved-lyrics', filters],
    queryFn: async () => {
      let query = supabase
        .from('saved_lyrics')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.favorite) {
        query = query.eq('is_favorite', true);
      }
      if (filters?.folder) {
        query = query.eq('folder', filters.folder);
      }
      if (filters?.search) {
        query = query.textSearch('search_vector', filters.search, {
          type: 'websearch',
          config: 'russian',
        });
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as SavedLyrics[];
    },
  });

  // Save lyrics mutation
  const saveLyrics = useMutation({
    mutationFn: async (params: SaveLyricsParams) => {
      const { data, error } = await supabase.functions.invoke('save-lyrics', {
        body: params,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] });
      toast.success('Лирика сохранена в библиотеку');
      logger.info('Lyrics saved to library', 'useSavedLyrics');
    },
    onError: (error: Error) => {
      toast.error('Не удалось сохранить лирику');
      logger.error('Failed to save lyrics', error, 'useSavedLyrics');
    },
  });

  // Update lyrics mutation
  const updateLyrics = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<SavedLyrics> 
    }) => {
      const { data, error } = await supabase
        .from('saved_lyrics')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] });
      toast.success('Лирика обновлена');
    },
    onError: (error: Error) => {
      toast.error('Не удалось обновить лирику');
      logger.error('Failed to update lyrics', error, 'useSavedLyrics');
    },
  });

  // Delete lyrics mutation
  const deleteLyrics = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_lyrics')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] });
      toast.success('Лирика удалена');
    },
    onError: (error: Error) => {
      toast.error('Не удалось удалить лирику');
      logger.error('Failed to delete lyrics', error, 'useSavedLyrics');
    },
  });

  // Toggle favorite
  const toggleFavorite = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { error } = await supabase
        .from('saved_lyrics')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-lyrics'] });
    },
  });

  // Track usage
  const trackUsage = useMutation({
    mutationFn: async (id: string) => {
      // Get current usage count
      const { data: current } = await supabase
        .from('saved_lyrics')
        .select('usage_count')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('saved_lyrics')
        .update({
          usage_count: (current?.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
  });

  return {
    lyrics,
    isLoading,
    error,
    saveLyrics,
    updateLyrics,
    deleteLyrics,
    toggleFavorite,
    trackUsage,
  };
}