/**
 * React Query Configuration
 * Optimized for performance and caching
 * 
 * @version 1.0.0
 */

import type { QueryClientConfig } from '@tanstack/react-query';

/**
 * Query client configuration with optimized defaults
 */
export const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      // Cache for 5 minutes
      staleTime: 5 * 60 * 1000,
      
      // Keep in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      
      // Don't refetch on window focus (use realtime instead)
      refetchOnWindowFocus: false,
      
      // Always refetch on reconnect
      refetchOnReconnect: 'always',
      
      // Retry failed requests with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Enable structural sharing for better performance
      structuralSharing: true,
      
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      retryDelay: 1000,
      
      // Network mode
      networkMode: 'online',
    },
  },
};

/**
 * Query key factory for consistent key generation
 */
export const queryKeys = {
  tracks: {
    all: ['tracks'] as const,
    lists: () => [...queryKeys.tracks.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.tracks.lists(), filters] as const,
    details: () => [...queryKeys.tracks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tracks.details(), id] as const,
    versions: (trackId: string) => [...queryKeys.tracks.detail(trackId), 'versions'] as const,
    stems: (trackId: string) => [...queryKeys.tracks.detail(trackId), 'stems'] as const,
  },
  lyrics: {
    all: ['lyrics'] as const,
    lists: () => [...queryKeys.lyrics.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.lyrics.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.lyrics.all, id] as const,
  },
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.projects.all, id] as const,
  },
  user: {
    profile: ['user', 'profile'] as const,
    settings: ['user', 'settings'] as const,
  },
} as const;
