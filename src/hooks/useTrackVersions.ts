/**
 * Hook for fetching track versions
 * Handles both variant_index (new Mureka format) and version_number (old format)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface TrackVersion {
  id: string;
  parent_track_id: string;
  variant_index: number | null;
  version_number: number | null;
  audio_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  lyrics: string | null;
  duration: number | null;
  suno_id: string | null;
  is_preferred_variant: boolean;
  is_primary_variant: boolean;
  metadata: Record<string, unknown> | null;
  title?: string;
  created_at: string;
}

export const useTrackVersions = (trackId: string | null) => {
  return useQuery({
    queryKey: ['track-versions', trackId],
    queryFn: async () => {
      if (!trackId) return [];
      
      // ✅ FIX: Искать по variant_index (новый формат Mureka)
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('parent_track_id', trackId)
        .order('variant_index', { ascending: true, nullsFirst: false })
        .order('version_number', { ascending: true, nullsFirst: false });
      
      if (error) {
        logger.error('Failed to fetch track versions', error instanceof Error ? error : new Error(String(error)), 'useTrackVersions');
        throw error;
      }
      
      // ✅ Фильтровать только версии с audio_url
      return (data || []).filter(v => !!v.audio_url) as TrackVersion[];
    },
    enabled: !!trackId,
    staleTime: 5 * 60 * 1000, // 5 минут
    refetchOnWindowFocus: false,
  });
};
