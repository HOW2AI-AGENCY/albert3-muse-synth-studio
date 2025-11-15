/**
 * Cache Warming Strategy
 * ✅ P1: Preload frequently accessed data into cache
 * Reduces latency for common operations
 */

import { createSupabaseAdminClient } from "./supabase.ts";
import { logger } from "./logger.ts";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * In-memory cache with TTL support
 */
class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000; // Max entries

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    // LRU eviction if cache full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value as string | undefined;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

export const globalCache = new MemoryCache();

/**
 * Cache warming strategies
 */
export class CacheWarmer {
  private supabase = createSupabaseAdminClient();

  /**
   * Warm provider models cache
   */
  async warmProviderModels(): Promise<void> {
    const cacheKey = "provider:models";
    
    const models = {
      suno: [
        { id: "V3_5", name: "Suno V3.5", maxDuration: 240 },
        { id: "V4", name: "Suno V4", maxDuration: 240 },
        { id: "V5", name: "Suno V5 (Recommended)", maxDuration: 240 },
      ],
      mureka: [
        { id: "mureka-6", name: "Mureka 6", maxDuration: 180 },
        { id: "mureka-7.5", name: "Mureka 7.5", maxDuration: 180 },
        { id: "mureka-o1", name: "Mureka O1 (Recommended)", maxDuration: 180 },
      ],
    };

    globalCache.set(cacheKey, models, 3600); // 1 hour TTL
    logger.info("Provider models cache warmed");
  }

  /**
   * Warm genre presets cache
   */
  async warmGenrePresets(): Promise<void> {
    const cacheKey = "genre:presets";

    const presets = [
      { id: "pop", name: "Pop", tags: ["pop", "catchy", "upbeat"] },
      { id: "rock", name: "Rock", tags: ["rock", "energetic", "guitar"] },
      { id: "electronic", name: "Electronic", tags: ["electronic", "synth", "dance"] },
      { id: "classical", name: "Classical", tags: ["classical", "orchestral", "elegant"] },
      { id: "jazz", name: "Jazz", tags: ["jazz", "smooth", "saxophone"] },
      { id: "hiphop", name: "Hip-Hop", tags: ["hip-hop", "beats", "rap"] },
    ];

    globalCache.set(cacheKey, presets, 3600);
    logger.info("Genre presets cache warmed");
  }

  /**
   * Warm user-specific data (for active users)
   */
  async warmUserData(userId: string): Promise<void> {
    const startTime = Date.now();

    // Parallel fetching
    const [profile, recentTracks, projects] = await Promise.all([
      this.supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single(),
      
      this.supabase
        .from("tracks")
        .select("id, title, status, audio_url, cover_url, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      
      this.supabase
        .from("music_projects")
        .select("id, name, total_tracks, cover_url")
        .eq("user_id", userId)
        .order("last_activity_at", { ascending: false })
        .limit(10),
    ]);

    // Cache results
    if (profile.data) {
      globalCache.set(`user:profile:${userId}`, profile.data, 600);
    }
    if (recentTracks.data) {
      globalCache.set(`user:recent_tracks:${userId}`, recentTracks.data, 300);
    }
    if (projects.data) {
      globalCache.set(`user:projects:${userId}`, projects.data, 300);
    }

    logger.info("User data cache warmed", {
      userId,
      duration: Date.now() - startTime,
      itemsCached: 3,
    });
  }

  /**
   * Warm all common caches on startup
   */
  async warmAll(): Promise<void> {
    const startTime = Date.now();

    await Promise.all([
      this.warmProviderModels(),
      this.warmGenrePresets(),
    ]);

    logger.info("All caches warmed", {
      duration: Date.now() - startTime,
      cacheSize: globalCache.size(),
    });
  }
}

/**
 * Get cached data or fetch and cache
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // Try cache first
  const cached = globalCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetchFn();
  globalCache.set(key, data, ttlSeconds);
  
  return data;
}
