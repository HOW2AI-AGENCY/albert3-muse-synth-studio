import { trackCache } from '@/features/tracks';
import type { Track } from '@/types/track.types';
import { logError, logInfo, logWarn } from '@/utils/logger';

interface CacheableTrack {
  id: string;
  title: string;
  artist: string;
  audio_url: string;
  image_url?: string;
  duration?: number;
  genre?: string;
  created_at: string;
}

class TrackCacheService {
  private currentUserId: string | null = null;

  async setActiveUser(userId: string | null) {
    if (userId === this.currentUserId) {
      return;
    }

    if (!userId) {
      if (this.currentUserId) {
        logInfo('Clearing track cache after logout', 'TrackCacheService');
      }
      this.currentUserId = null;
      await trackCache.clearCache();
      return;
    }

    if (this.currentUserId && this.currentUserId !== userId) {
      logInfo('User changed, clearing cached tracks', 'TrackCacheService', {
        previousUserId: this.currentUserId,
        nextUserId: userId,
      });
      await trackCache.clearCache();
    }

    this.currentUserId = userId;
  }

  async cacheTracks(userId: string | null, tracks: Track[]) {
    if (!userId || tracks.length === 0) {
      return;
    }

    if (this.currentUserId !== userId) {
      await this.setActiveUser(userId);
    }

    const tracksToCache: CacheableTrack[] = tracks
      .filter(track => Boolean(track.audio_url))
      .map(track => ({
        id: track.id,
        title: track.title,
        artist: track.profile?.full_name || track.profile?.username || 'Unknown Artist',
        audio_url: track.audio_url!,
        image_url: track.cover_url || undefined,
        duration: track.duration_seconds ?? track.duration ?? undefined,
        genre: track.style_tags?.join(', ') || undefined,
        created_at: track.created_at,
      }));

    if (tracksToCache.length === 0) {
      return;
    }

    try {
      await trackCache.setTracks(tracksToCache);
    } catch (error) {
      logWarn('Failed to cache tracks in IndexedDB', 'TrackCacheService', { error });
    }
  }

  async removeTrack(trackId: string) {
    try {
      await trackCache.removeTrack(trackId);
    } catch (error) {
      logError('Failed to remove track from cache', error as Error, 'TrackCacheService', { trackId });
    }
  }

  async clearAll() {
    try {
      await trackCache.clearCache();
      this.currentUserId = null;
    } catch (error) {
      logError('Failed to clear track cache', error as Error, 'TrackCacheService');
    }
  }
}

export const trackCacheService = new TrackCacheService();
