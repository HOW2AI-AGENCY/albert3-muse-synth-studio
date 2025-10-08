import { supabase } from '@/integrations/supabase/client';
import * as Sentry from '@sentry/react';
import type { Metric } from 'web-vitals';

type SerializableMetric = Pick<Metric, 'id' | 'name' | 'delta' | 'value' | 'rating'> & {
  navigationType?: Metric['navigationType'];
  entries?: Array<Record<string, unknown>>;
};

const env = typeof import.meta !== 'undefined'
  ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
  : {};

const analyticsEndpoint = env.VITE_ANALYTICS_ENDPOINT;
const isSentryEnabled = Boolean(env.VITE_SENTRY_DSN);

export class AnalyticsService {
  /**
   * Record a play event for a track
   * Increments the view_count in the tracks table
   */
  static async recordPlay(trackId: string): Promise<void> {
    try {
      // Use the increment_play_count RPC function
      const { error } = await supabase.rpc('increment_play_count', {
        track_id: trackId
      });

      if (error) {
        console.error('Error in recordPlay:', error);
      }
    } catch (error) {
      console.error('Error recording play:', error);
      // Don't throw - analytics shouldn't break the app
    }
  }

  /**
   * Get analytics for a specific track
   */
  static async getTrackAnalytics(trackId: string) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('view_count, like_count, created_at')
        .eq('id', trackId)
        .maybeSingle();

      if (error) throw error;

      return {
        plays: data?.view_count || 0,
        likes: data?.like_count || 0,
        createdAt: data?.created_at,
      };
    } catch (error) {
      console.error('Error fetching track analytics:', error);
      return {
        plays: 0,
        likes: 0,
        createdAt: null,
      };
    }
  }

  /**
   * Get user's most played tracks
   */
  static async getMostPlayedTracks(userId: string, limit: number = 10) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, view_count, like_count, cover_url, style_tags')
        .eq('user_id', userId)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching most played tracks:', error);
      return [];
    }
  }

  /**
   * Get user's total stats
   */
  static async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('tracks')
        .select('view_count, like_count')
        .eq('user_id', userId);

      if (error) throw error;

      const totalPlays = data?.reduce((sum, track) => sum + (track.view_count || 0), 0) || 0;
      const totalLikes = data?.reduce((sum, track) => sum + (track.like_count || 0), 0) || 0;

      return {
        totalTracks: data?.length || 0,
        totalPlays,
        totalLikes,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return {
        totalTracks: 0,
        totalPlays: 0,
        totalLikes: 0,
      };
    }
  }

  static async reportWebVital(metric: Metric): Promise<void> {
    const payload: SerializableMetric & { timestamp: string } = {
      id: metric.id,
      name: metric.name,
      delta: Number(metric.delta.toFixed(4)),
      value: Number(metric.value.toFixed(4)),
      rating: metric.rating,
      navigationType: metric.navigationType,
      entries: metric.entries?.map((entry) => ({
        name: entry.name,
        startTime: Number(entry.startTime?.toFixed?.(2) ?? entry.startTime ?? 0),
        duration: Number(entry.duration?.toFixed?.(2) ?? entry.duration ?? 0),
        entryType: entry.entryType,
      })),
      timestamp: new Date().toISOString(),
    };

    try {
      AnalyticsService.sendToSentry(payload);
      await AnalyticsService.sendToCustomEndpoint(payload);
    } catch (error) {
      console.error('Error reporting web vital', metric.name, error);
    }
  }

  private static sendToSentry(metric: SerializableMetric & { timestamp: string }): void {
    if (!isSentryEnabled) {
      return;
    }

    Sentry.addBreadcrumb({
      category: 'web-vitals',
      message: `${metric.name}=${metric.value}`,
      level: 'info',
      data: metric,
    });

    Sentry.captureEvent({
      message: `web-vital:${metric.name}`,
      level: 'info',
      tags: {
        metric: metric.name,
        rating: metric.rating,
      },
      contexts: {
        webVital: metric,
      },
    });
  }

  private static async sendToCustomEndpoint(metric: SerializableMetric & { timestamp: string }): Promise<void> {
    if (!analyticsEndpoint) {
      return;
    }

    const body = JSON.stringify(metric);

    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(analyticsEndpoint, blob);
      return;
    }

    await fetch(analyticsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    });
  }
}
