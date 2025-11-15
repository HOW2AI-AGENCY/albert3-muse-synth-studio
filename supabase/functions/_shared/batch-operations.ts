/**
 * Batch Database Operations
 * ✅ P1: Reduce DB round-trips by batching operations
 * Improves performance for bulk operations
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logger } from "./logger.ts";

/**
 * Batch insert tracks with optimized chunk size
 */
export async function batchInsertTracks(
  supabase: SupabaseClient,
  tracks: Array<Record<string, any>>,
  chunkSize: number = 100
): Promise<{ inserted: number; errors: number }> {
  const startTime = Date.now();
  let inserted = 0;
  let errors = 0;

  // Split into chunks
  for (let i = 0; i < tracks.length; i += chunkSize) {
    const chunk = tracks.slice(i, i + chunkSize);
    
    const { error } = await supabase
      .from('tracks')
      .insert(chunk);

    if (error) {
      logger.error('Batch insert error', {
        error: error.message,
        chunkIndex: Math.floor(i / chunkSize),
        chunkSize: chunk.length,
      });
      errors += chunk.length;
    } else {
      inserted += chunk.length;
    }
  }

  logger.info('Batch insert completed', {
    total: tracks.length,
    inserted,
    errors,
    duration: Date.now() - startTime,
  });

  return { inserted, errors };
}

/**
 * Batch update track statuses
 */
export async function batchUpdateTrackStatus(
  supabase: SupabaseClient,
  updates: Array<{ id: string; status: string; error_message?: string }>,
  chunkSize: number = 50
): Promise<{ updated: number; errors: number }> {
  const startTime = Date.now();
  let updated = 0;
  let errors = 0;

  // Process in parallel chunks
  const chunks = [];
  for (let i = 0; i < updates.length; i += chunkSize) {
    chunks.push(updates.slice(i, i + chunkSize));
  }

  const results = await Promise.allSettled(
    chunks.map(async (chunk) => {
      // Use upsert for better performance
      const { error, count } = await supabase
        .from('tracks')
        .upsert(chunk.map(u => ({
          id: u.id,
          status: u.status,
          error_message: u.error_message,
          updated_at: new Date().toISOString(),
        })), {
          onConflict: 'id',
        })
        .select('id');

      if (error) throw error;
      return count || 0;
    })
  );

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      updated += result.value;
    } else {
      logger.error('Batch update chunk failed', { error: result.reason });
      errors++;
    }
  });

  logger.info('Batch update completed', {
    total: updates.length,
    updated,
    errors,
    duration: Date.now() - startTime,
  });

  return { updated, errors };
}

/**
 * Batch fetch tracks with selected fields only
 */
export async function batchFetchTracks(
  supabase: SupabaseClient,
  trackIds: string[],
  fields: string[] = ['id', 'title', 'status', 'audio_url', 'cover_url']
): Promise<Array<Record<string, any>>> {
  if (trackIds.length === 0) return [];

  const fieldList = fields.join(', ');
  
  // Use IN query with limit to avoid huge responses
  const { data, error } = await supabase
    .from('tracks')
    .select(fieldList)
    .in('id', trackIds)
    .limit(1000);

  if (error) {
    logger.error('Batch fetch error', {
      error: error.message,
      trackIds: trackIds.length,
    });
    return [];
  }

  return data || [];
}

/**
 * Batch delete old failed tracks (cleanup)
 */
export async function batchDeleteOldFailedTracks(
  supabase: SupabaseClient,
  daysOld: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from('tracks')
    .delete()
    .eq('status', 'failed')
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    logger.error('Batch delete error', { error: error.message });
    return 0;
  }

  const deletedCount = data?.length || 0;
  logger.info('Batch delete old failed tracks', {
    deletedCount,
    daysOld,
  });

  return deletedCount;
}

/**
 * Batch increment counters (play_count, view_count, etc.)
 * Uses atomic increments for accuracy
 */
export async function batchIncrementCounters(
  supabase: SupabaseClient,
  increments: Array<{ trackId: string; field: 'play_count' | 'view_count' | 'download_count'; amount: number }>
): Promise<void> {
  // Group by field for efficient updates
  const byField = increments.reduce((acc, inc) => {
    if (!acc[inc.field]) acc[inc.field] = [];
    acc[inc.field].push({ id: inc.trackId, amount: inc.amount });
    return acc;
  }, {} as Record<string, Array<{ id: string; amount: number }>>);

  await Promise.all(
    Object.entries(byField).map(async ([field, items]) => {
      // Use RPC for atomic increment
      await supabase.rpc('batch_increment_counter', {
        track_ids: items.map(i => i.id),
        field_name: field,
        amounts: items.map(i => i.amount),
      });
    })
  );

  logger.info('Batch increment counters completed', {
    total: increments.length,
  });
}
