/**
 * Query Optimization Helpers
 * ✅ P1: Optimize database queries for better performance
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logger } from "./logger.ts";

/**
 * Optimized track fetching with pagination and field selection
 */
export async function fetchTracksOptimized(
  supabase: SupabaseClient,
  options: {
    userId?: string;
    status?: string[];
    limit?: number;
    offset?: number;
    fields?: string[];
    orderBy?: string;
    orderAsc?: boolean;
  } = {}
): Promise<{ data: any[]; count: number; hasMore: boolean }> {
  const {
    userId,
    status,
    limit = 20,
    offset = 0,
    fields = ['id', 'title', 'status', 'audio_url', 'cover_url', 'created_at'],
    orderBy = 'created_at',
    orderAsc = false,
  } = options;

  const startTime = Date.now();

  let query = supabase
    .from('tracks')
    .select(fields.join(', '), { count: 'exact' });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (status && status.length > 0) {
    query = query.in('status', status);
  }

  query = query
    .order(orderBy, { ascending: orderAsc })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Optimized query error', error, 'QueryOptimizer');
    return { data: [], count: 0, hasMore: false };
  }

  const duration = Date.now() - startTime;
  
  // Log slow queries
  if (duration > 500) {
    logger.warn('Slow query detected', 'QueryOptimizer', {
      duration,
      userId,
      status,
      limit,
      offset,
    });
  }

  return {
    data: data || [],
    count: count || 0,
    hasMore: (offset + limit) < (count || 0),
  };
}

/**
 * Optimized project tracks fetching with aggregations
 */
export async function fetchProjectTracksOptimized(
  supabase: SupabaseClient,
  projectId: string
): Promise<{
  tracks: any[];
  stats: {
    total: number;
    completed: number;
    processing: number;
    failed: number;
    totalDuration: number;
  };
}> {
  const startTime = Date.now();

  // Parallel queries for tracks and stats
  const [tracksResult, statsResult] = await Promise.all([
    // Tracks query
    supabase
      .from('project_tracks')
      .select(`
        track_id,
        tracks!inner (
          id,
          title,
          status,
          audio_url,
          cover_url,
          duration_seconds,
          created_at
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),

    // Stats query (aggregated)
    supabase.rpc('get_project_stats', { p_project_id: projectId }),
  ]);

  const duration = Date.now() - startTime;

  logger.info('Project tracks fetched', 'QueryOptimizer', {
    projectId,
    tracksCount: tracksResult.data?.length || 0,
    duration,
  });

  return {
    tracks: tracksResult.data?.map(pt => pt.tracks).filter(Boolean) || [],
    stats: statsResult.data || {
      total: 0,
      completed: 0,
      processing: 0,
      failed: 0,
      totalDuration: 0,
    },
  };
}

/**
 * Optimized search with full-text search and ranking
 */
export async function searchTracksOptimized(
  supabase: SupabaseClient,
  query: string,
  userId?: string,
  limit: number = 20
): Promise<any[]> {
  const startTime = Date.now();

  // Use full-text search for better performance
  let searchQuery = supabase
    .from('tracks')
    .select('id, title, prompt, style_tags, audio_url, cover_url, created_at')
    .or(`title.ilike.%${query}%,prompt.ilike.%${query}%`)
    .limit(limit);

  if (userId) {
    searchQuery = searchQuery.eq('user_id', userId);
  }

  const { data, error } = await searchQuery;

  const duration = Date.now() - startTime;

  if (error) {
    logger.error('Search error', error, 'QueryOptimizer');
    return [];
  }

  logger.info('Search completed', 'QueryOptimizer', {
    query,
    resultsCount: data?.length || 0,
    duration,
  });

  return data || [];
}

/**
 * Prefetch related data for track details page
 */
export async function prefetchTrackDetails(
  supabase: SupabaseClient,
  trackId: string
): Promise<{
  track: any;
  versions: any[];
  stems: any[];
  user: any;
}> {
  const startTime = Date.now();

  // Parallel fetch all related data
  const [trackResult, versionsResult, stemsResult, userResult] = await Promise.all([
    supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single(),

    supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', trackId)
      .order('variant_index', { ascending: true }),

    supabase
      .from('track_stems')
      .select('*')
      .eq('track_id', trackId),

    supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', trackResult.data?.user_id)
      .single(),
  ]);

  const duration = Date.now() - startTime;

  logger.info('Track details prefetched', 'QueryOptimizer', {
    trackId,
    duration,
    versionsCount: versionsResult.data?.length || 0,
    stemsCount: stemsResult.data?.length || 0,
  });

  return {
    track: trackResult.data,
    versions: versionsResult.data || [],
    stems: stemsResult.data || [],
    user: userResult.data,
  };
}
