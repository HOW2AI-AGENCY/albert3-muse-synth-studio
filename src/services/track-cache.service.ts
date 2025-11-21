import { trackCacheIDB } from '@/features/tracks';
import type { Track } from '@/types/track.types';
import { logError, logInfo, logWarn } from '@/utils/logger';

interface CacheableTrack {
  id: string;
  title: string;
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
      await trackCacheIDB.clearAll();
      return;
    }

    if (this.currentUserId && this.currentUserId !== userId) {
      logInfo('User changed, clearing cached tracks', 'TrackCacheService', {
        previousUserId: this.currentUserId,
        nextUserId: userId,
      });
      await trackCacheIDB.clearAll();
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
      await trackCacheIDB.setTracks(tracksToCache);
    } catch (error) {
      logWarn('Failed to cache tracks in IndexedDB', 'TrackCacheService', { error });
    }
  }

  async removeTrack(trackId: string) {
    try {
      await trackCacheIDB.removeTrack(trackId);
    } catch (error) {
      logError('Failed to remove track from cache', error as Error, 'TrackCacheService', { trackId });
    }
  }

  async clearAll() {
    try {
      await trackCacheIDB.clearAll();
      this.currentUserId = null;
    } catch (error) {
      logError('Failed to clear track cache', error as Error, 'TrackCacheService');
    }
  }
}

export const trackCacheService = new TrackCacheService();
