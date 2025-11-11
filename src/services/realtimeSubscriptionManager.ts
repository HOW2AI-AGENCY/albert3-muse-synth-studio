/**
 * Centralized Realtime Subscription Manager
 *
 * PURPOSE: Eliminate overlapping subscriptions and memory leaks
 *
 * PROBLEM SOLVED (P0-2):
 * - useTracks, useGenerateMusic, useTrackSync, GenerationService all create separate channels
 * - Result: 3-4 channels per track = memory leak + redundant processing
 *
 * SOLUTION:
 * - Single channel per unique subscription key
 * - Multiple listeners can share same channel
 * - Channel removed when last listener unsubscribes
 *
 * @author Claude Code Analysis
 * @date 2025-11-10
 */

import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

type Listener<T> = (data: T) => void;

interface Subscription<T> {
  channel: RealtimeChannel;
  listeners: Set<Listener<T>>;
  channelName: string;
  createdAt: number;
}

interface SubscriptionStats {
  key: string;
  channelName: string;
  listenerCount: number;
  createdAt: number;
  ageSeconds: number;
}

/**
 * Centralized manager for all Supabase realtime subscriptions
 * Prevents duplicate channels and memory leaks
 */
class RealtimeSubscriptionManager {
  private static subscriptions = new Map<string, Subscription<any>>();

  /**
   * Subscribe to a specific track's updates
   * Multiple listeners can subscribe to same track without creating duplicate channels
   *
   * @param trackId - Track ID to monitor
   * @param listener - Callback when track updates
   * @returns Unsubscribe function
   */
  static subscribeToTrack<T extends Record<string, any> = Record<string, any>>(
    trackId: string,
    listener: Listener<RealtimePostgresChangesPayload<T>>
  ): () => void {
    const key = `track:${trackId}`;

    // Reuse existing channel if available
    if (this.subscriptions.has(key)) {
      const sub = this.subscriptions.get(key)!;
      sub.listeners.add(listener);
      logger.info('Added listener to existing track channel', 'RealtimeManager', {
        key,
        listenerCount: sub.listeners.size,
      });

      return () => this.unsubscribe(key, listener);
    }

    // Create new channel
    const channelName = `track-updates-${trackId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          const sub = this.subscriptions.get(key);
          if (sub) {
            // Notify all listeners
            sub.listeners.forEach((l) => {
              try {
                l(payload);
              } catch (error) {
                logger.error('Listener error in track subscription', error as Error, 'RealtimeManager', { key });
              }
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Track channel subscribed', 'RealtimeManager', { channelName, trackId });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.error(
            'Track channel error',
            new Error(`Channel status: ${status}`),
            'RealtimeManager',
            { channelName, trackId }
          );
        }
      });

    this.subscriptions.set(key, {
      channel,
      listeners: new Set([listener]),
      channelName,
      createdAt: Date.now(),
    });

    logger.info('Created new track channel', 'RealtimeManager', { key, channelName });

    return () => this.unsubscribe(key, listener);
  }

  /**
   * Subscribe to all tracks for a user
   * Optionally filter by project
   *
   * @param userId - User ID to monitor
   * @param projectId - Optional project filter
   * @param listener - Callback when tracks update
   * @returns Unsubscribe function
   */
  static subscribeToUserTracks<T extends Record<string, any> = Record<string, any>>(
    userId: string,
    projectId: string | null,
    listener: Listener<RealtimePostgresChangesPayload<T>>
  ): () => void {
    const key = `user:${userId}:project:${projectId ?? 'all'}`;

    if (this.subscriptions.has(key)) {
      const sub = this.subscriptions.get(key)!;
      sub.listeners.add(listener);
      logger.info('Added listener to existing user tracks channel', 'RealtimeManager', {
        key,
        listenerCount: sub.listeners.size,
      });

      return () => this.unsubscribe(key, listener);
    }

    const channelName = `tracks-user-${userId}-project-${projectId ?? 'all'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tracks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const sub = this.subscriptions.get(key);
          if (sub) {
            // Notify all listeners
            sub.listeners.forEach((l) => {
              try {
                l(payload);
              } catch (error) {
                logger.error('Listener error in user tracks subscription', error as Error, 'RealtimeManager', {
                  key,
                });
              }
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('User tracks channel subscribed', 'RealtimeManager', {
            channelName,
            userId,
            projectId,
          });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          logger.error(
            'User tracks channel error',
            new Error(`Channel status: ${status}`),
            'RealtimeManager',
            { channelName, userId, projectId }
          );
        }
      });

    this.subscriptions.set(key, {
      channel,
      listeners: new Set([listener]),
      channelName,
      createdAt: Date.now(),
    });

    logger.info('Created new user tracks channel', 'RealtimeManager', { key, channelName });

    return () => this.unsubscribe(key, listener);
  }

  /**
   * Subscribe to track_versions updates for a track
   *
   * @param trackId - Parent track ID
   * @param listener - Callback when versions change
   * @returns Unsubscribe function
   */
  static subscribeToTrackVersions<T extends Record<string, any> = Record<string, any>>(
    trackId: string,
    listener: Listener<RealtimePostgresChangesPayload<T>>
  ): () => void {
    const key = `track_versions:${trackId}`;

    if (this.subscriptions.has(key)) {
      const sub = this.subscriptions.get(key)!;
      sub.listeners.add(listener);
      logger.info('Added listener to existing track versions channel', 'RealtimeManager', {
        key,
        listenerCount: sub.listeners.size,
      });

      return () => this.unsubscribe(key, listener);
    }

    const channelName = `track-versions-${trackId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'track_versions',
          filter: `parent_track_id=eq.${trackId}`,
        },
        (payload) => {
          const sub = this.subscriptions.get(key);
          if (sub) {
            sub.listeners.forEach((l) => {
              try {
                l(payload);
              } catch (error) {
                logger.error(
                  'Listener error in track versions subscription',
                  error as Error,
                  'RealtimeManager',
                  { key }
                );
              }
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Track versions channel subscribed', 'RealtimeManager', {
            channelName,
            trackId,
          });
        }
      });

    this.subscriptions.set(key, {
      channel,
      listeners: new Set([listener]),
      channelName,
      createdAt: Date.now(),
    });

    logger.info('Created new track versions channel', 'RealtimeManager', { key, channelName });

    return () => this.unsubscribe(key, listener);
  }

  /**
   * Unsubscribe a listener
   * If no listeners remain, remove the channel
   */
  private static unsubscribe<T>(key: string, listener: Listener<T>): void {
    const sub = this.subscriptions.get(key);
    if (!sub) {
      logger.warn('Attempted to unsubscribe from non-existent subscription', 'RealtimeManager', {
        key,
      });
      return;
    }

    sub.listeners.delete(listener);
    logger.info('Removed listener', 'RealtimeManager', {
      key,
      remainingListeners: sub.listeners.size,
    });

    // If no listeners remain, remove channel
    if (sub.listeners.size === 0) {
      void supabase.removeChannel(sub.channel);
      this.subscriptions.delete(key);
      logger.info('Removed channel (no listeners remain)', 'RealtimeManager', {
        key,
        channelName: sub.channelName,
      });
    }
  }

  /**
   * Get active subscription statistics (for debugging/monitoring)
   */
  static getActiveSubscriptions(): SubscriptionStats[] {
    const now = Date.now();
    return Array.from(this.subscriptions.entries()).map(([key, sub]) => ({
      key,
      channelName: sub.channelName,
      listenerCount: sub.listeners.size,
      createdAt: sub.createdAt,
      ageSeconds: Math.floor((now - sub.createdAt) / 1000),
    }));
  }

  /**
   * Get subscription count by type (for monitoring)
   */
  static getStats(): {
    total: number;
    byType: Record<string, number>;
    totalListeners: number;
  } {
    const byType: Record<string, number> = {};
    let totalListeners = 0;

    this.subscriptions.forEach((sub, key) => {
      const type = key.split(':')[0];
      byType[type] = (byType[type] || 0) + 1;
      totalListeners += sub.listeners.size;
    });

    return {
      total: this.subscriptions.size,
      byType,
      totalListeners,
    };
  }

  /**
   * Clear all subscriptions (for testing or cleanup)
   */
  static clearAll(): void {
    this.subscriptions.forEach((sub) => {
      void supabase.removeChannel(sub.channel);
    });
    this.subscriptions.clear();
    logger.info('Cleared all realtime subscriptions', 'RealtimeManager');
  }

  /**
   * Log current subscription state (for debugging)
   */
  static logDebugInfo(): void {
    const stats = this.getStats();
    const subscriptions = this.getActiveSubscriptions();

    logger.info('Realtime Subscription Manager Debug Info', 'RealtimeManager', {
      stats,
      subscriptions,
    });

    console.group('🔴 Realtime Subscription Manager');
    console.log('Total Channels:', stats.total);
    console.log('Total Listeners:', stats.totalListeners);
    console.log('By Type:', stats.byType);
    console.table(subscriptions);
    console.groupEnd();
  }
}

export default RealtimeSubscriptionManager;
