/**
 * Query Prefetching Hook
 * Week 3: Smart Loading & Caching
 * 
 * Prefetches likely next queries to improve perceived performance
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UsePrefetchQueriesOptions {
  enabled?: boolean;
}

export const usePrefetchQueries = (options: UsePrefetchQueriesOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const prefetchUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Prefetch user profile
        await queryClient.prefetchQuery({
          queryKey: ['profile', user.id],
          queryFn: async () => {
            const { data } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            return data;
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
        });

        // Prefetch recent tracks
        await queryClient.prefetchQuery({
          queryKey: ['tracks', 'recent'],
          queryFn: async () => {
            const { data } = await supabase
              .from('tracks')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(20);
            return data;
          },
          staleTime: 2 * 60 * 1000, // 2 minutes
        });

        // Prefetch liked tracks
        await queryClient.prefetchQuery({
          queryKey: ['track-likes', user.id],
          queryFn: async () => {
            const { data } = await supabase
              .from('track_likes')
              .select('track_id')
              .eq('user_id', user.id);
            return data?.map(like => like.track_id) || [];
          },
          staleTime: 5 * 60 * 1000,
        });
      } catch (error) {
        console.error('[Prefetch] Failed to prefetch queries:', error);
      }
    };

    // Prefetch on idle
    const timeoutId = setTimeout(prefetchUserData, 1000);

    return () => clearTimeout(timeoutId);
  }, [enabled, queryClient]);
};

export const usePrefetchTrackDetails = (trackId: string | null) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!trackId) return;

    const prefetch = async () => {
      try {
        // Prefetch track versions
        await queryClient.prefetchQuery({
          queryKey: ['track-versions', trackId],
          queryFn: async () => {
            const { data } = await supabase
              .from('track_versions')
              .select('*')
              .eq('parent_track_id', trackId)
              .order('version_number', { ascending: false });
            return data;
          },
          staleTime: 5 * 60 * 1000,
        });

        // Prefetch track stems
        await queryClient.prefetchQuery({
          queryKey: ['track-stems', trackId],
          queryFn: async () => {
            const { data } = await supabase
              .from('track_stems')
              .select('*')
              .eq('track_id', trackId);
            return data;
          },
          staleTime: 5 * 60 * 1000,
        });
      } catch (error) {
        console.error('[Prefetch] Failed to prefetch track details:', error);
      }
    };

    const timeoutId = setTimeout(prefetch, 500);
    return () => clearTimeout(timeoutId);
  }, [trackId, queryClient]);
};
