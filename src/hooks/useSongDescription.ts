import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSongDescription = (trackId: string | null) => {
  return useQuery({
    queryKey: ['song-description', trackId],
    queryFn: async () => {
      if (!trackId) return null;

      const { data, error } = await supabase
        .from('song_descriptions')
        .select('*')
        .eq('track_id', trackId)
        .eq('status', 'completed')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found - not an error
          return null;
        }
        throw error;
      }

      return data;
    },
    enabled: !!trackId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
