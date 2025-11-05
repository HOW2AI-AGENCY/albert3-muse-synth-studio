/**
 * Projects Query Hook
 * Uses React Query for automatic caching, refetching, and state management
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];

/**
 * Query key factory for projects
 */
export const projectsKeys = {
  all: ['projects'] as const,
  lists: () => [...projectsKeys.all, 'list'] as const,
  list: (userId: string | null) => [...projectsKeys.lists(), userId] as const,
  details: () => [...projectsKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectsKeys.details(), id] as const,
};

/**
 * Fetch projects for current user
 */
const fetchProjects = async (userId: string | null): Promise<MusicProject[]> => {
  if (!userId) {
    return [];
  }

  const { data, error } = await supabase
    .from('music_projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to fetch projects', error, 'useProjectsQuery', { userId });
    throw error;
  }

  logger.info('Projects fetched', 'useProjectsQuery', {
    count: data?.length || 0,
    userId
  });

  return data || [];
};

/**
 * Hook to fetch all projects for current user
 *
 * Features:
 * - Automatic caching (5 minutes stale time)
 * - Automatic refetching on window focus
 * - Optimistic updates support
 * - Real-time subscription ready
 *
 * @example
 * ```tsx
 * const { projects, isLoading, error, refetch } = useProjectsQuery();
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error />;
 *
 * return <ProjectsList projects={projects} />;
 * ```
 */
export const useProjectsQuery = () => {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: projectsKeys.list(userId),
    queryFn: () => fetchProjects(userId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,

    // Utility methods
    invalidate: () => queryClient.invalidateQueries({
      queryKey: projectsKeys.list(userId)
    }),
  };
};

/**
 * Hook to fetch single project by ID
 *
 * @param projectId - Project ID to fetch
 *
 * @example
 * ```tsx
 * const { project, isLoading } = useProjectQuery(projectId);
 * ```
 */
export const useProjectQuery = (projectId: string | null) => {
  const query = useQuery({
    queryKey: projectsKeys.detail(projectId!),
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('music_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        logger.error('Failed to fetch project', error, 'useProjectQuery', { projectId });
        throw error;
      }

      return data;
    },
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000,
  });

  return {
    project: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
