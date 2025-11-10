/**
 * ✅ NEW: useTrackVariants Hook (Refactored Version)
 *
 * Replaces useTrackVersions with cleaner API
 * Works with the new getTrackWithVariants() function
 *
 * Key improvements:
 * - No version 0 confusion
 * - Clear separation: mainTrack vs variants
 * - Simplified return values
 * - Better TypeScript types
 *
 * Usage:
 * ```tsx
 * const { mainTrack, variants, preferredVariant, isLoading } = useTrackVariants(trackId);
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getTrackWithVariants,
  TrackVariant,
  TrackWithVariantsResult,
  getPreferredVariant,
  setMasterVersion as setMasterVersionApi,
  unwrapResult,
} from '../api/trackVersions';
import { logInfo, logError } from '@/utils/logger';

// Cache for track variants (by trackId)
const variantsCache = new Map<string, TrackWithVariantsResult>();

// Listeners for cache updates
type VariantsListener = (result: TrackWithVariantsResult | null) => void;
const variantsListeners = new Map<string, Set<VariantsListener>>();

// In-flight requests to prevent duplicate fetches
const inFlightRequests = new Map<string, Promise<TrackWithVariantsResult | null>>();

/**
 * Subscribe to variants cache updates
 */
export const subscribeToTrackVariants = (trackId: string, listener: VariantsListener) => {
  if (!trackId) {
    return () => {};
  }

  const subscribers = variantsListeners.get(trackId) ?? new Set<VariantsListener>();
  subscribers.add(listener);
  variantsListeners.set(trackId, subscribers);

  return () => {
    const currentSubscribers = variantsListeners.get(trackId);
    if (!currentSubscribers) {
      return;
    }
    currentSubscribers.delete(listener);
    if (currentSubscribers.size === 0) {
      variantsListeners.delete(trackId);
    }
  };
};

/**
 * Notify all listeners about cache update
 */
const notifyVariantsListeners = (trackId: string, result: TrackWithVariantsResult | null) => {
  const listeners = variantsListeners.get(trackId);
  if (!listeners) {
    return;
  }

  listeners.forEach(listener => {
    try {
      listener(result);
    } catch (error) {
      logError('Variants listener failed', error as Error, 'useTrackVariants', { trackId });
    }
  });
};

/**
 * Update cache and notify listeners
 */
const setVariantsCache = (trackId: string, result: TrackWithVariantsResult | null) => {
  if (result) {
    variantsCache.set(trackId, result);
  } else {
    variantsCache.delete(trackId);
  }
  notifyVariantsListeners(trackId, result);
};

interface FetchOptions {
  force?: boolean;
}

/**
 * Fetch track variants with cache support
 * Exported for use in other modules
 */
export const fetchTrackVariants = async (trackId: string, options: FetchOptions = {}) => {
  if (!trackId) {
    return null;
  }

  // Check cache first
  if (!options.force) {
    const cached = variantsCache.get(trackId);
    if (cached) {
      return cached;
    }

    // Check in-flight requests
    const pending = inFlightRequests.get(trackId);
    if (pending) {
      return pending;
    }
  }

  // Fetch from API
  const request = getTrackWithVariants(trackId)
    .then(result => {
      inFlightRequests.delete(trackId);
      setVariantsCache(trackId, result);
      return result;
    })
    .catch(error => {
      inFlightRequests.delete(trackId);
      logError('Failed to fetch variants', error as Error, 'useTrackVariants', { trackId });
      throw error;
    });

  inFlightRequests.set(trackId, request);
  return request;
};

/**
 * Prime the cache with data (for optimization)
 */
export const primeTrackVariantsCache = (trackId: string, result: TrackWithVariantsResult) => {
  if (!trackId) {
    return;
  }
  setVariantsCache(trackId, result);
};

/**
 * Invalidate cache entry
 */
export const invalidateTrackVariantsCache = (trackId: string) => {
  if (!trackId) {
    return;
  }
  setVariantsCache(trackId, null);
};

/**
 * Clear all caches
 */
export const resetTrackVariantsCache = () => {
  variantsCache.clear();
  variantsListeners.clear();
  inFlightRequests.clear();
};

/**
 * Hook return type
 */
interface UseTrackVariantsReturn {
  /** The main track (from tracks table) */
  mainTrack: TrackWithVariantsResult['mainTrack'] | null;

  /** All variants (variant_index >= 1) */
  variants: TrackVariant[];

  /** The preferred variant (if set) */
  preferredVariant: TrackVariant | null;

  /** Number of variants */
  variantCount: number;

  /** Is the track loading? */
  isLoading: boolean;

  /** Error (if any) */
  error: Error | null;

  /** Reload variants */
  reload: (options?: FetchOptions) => Promise<void>;

  /** Set preferred variant */
  setPreferred: (variantId: string) => Promise<void>;

  /** Check if track has variants */
  hasVariants: boolean;
}

/**
 * ✅ NEW: Hook for track variants
 *
 * @param trackId - Track ID to load
 * @param autoLoad - Auto-load on mount (default: true)
 * @returns Track variants data and helper functions
 */
export function useTrackVariants(
  trackId: string | null | undefined,
  autoLoad: boolean = true
): UseTrackVariantsReturn {
  const [data, setData] = useState<TrackWithVariantsResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load variants from API
   */
  const reload = useCallback(async (options: FetchOptions = {}) => {
    if (!trackId) {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logInfo('Loading track variants', 'useTrackVariants', { trackId, force: options.force });

      const result = await fetchTrackVariants(trackId, options);
      setData(result);

      logInfo('Track variants loaded', 'useTrackVariants', {
        trackId,
        variantCount: result?.variants.length || 0,
        hasPreferred: Boolean(result?.preferredVariant),
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      logError('Failed to load track variants', error, 'useTrackVariants', { trackId });
    } finally {
      setIsLoading(false);
    }
  }, [trackId]);

  /**
   * Set preferred variant
   */
  const setPreferred = useCallback(async (variantId: string) => {
    if (!trackId || !data) {
      logError('Cannot set preferred variant: missing trackId or data', new Error('Invalid state'), 'useTrackVariants', { trackId, variantId });
      return;
    }

    try {
      logInfo('Setting preferred variant', 'useTrackVariants', { trackId, variantId });

      const result = await setMasterVersionApi(trackId, variantId);
      unwrapResult(result);

      // Reload to update UI
      await reload({ force: true });

      logInfo('Preferred variant set successfully', 'useTrackVariants', { trackId, variantId });
    } catch (error) {
      logError('Failed to set preferred variant', error as Error, 'useTrackVariants', { trackId, variantId });
      throw error;
    }
  }, [trackId, data, reload]);

  /**
   * Auto-load on mount and trackId change
   */
  useEffect(() => {
    if (!trackId) {
      setData(null);
      return;
    }

    // Check cache first
    const cached = variantsCache.get(trackId);
    if (cached) {
      setData(cached);
    }

    // Subscribe to cache updates
    const unsubscribe = subscribeToTrackVariants(trackId, setData);

    // Auto-load if enabled
    if (autoLoad) {
      reload({ force: false }).catch(error => {
        logError('Failed to auto-load track variants', error as Error, 'useTrackVariants', { trackId });
      });
    }

    return () => {
      unsubscribe();
    };
  }, [trackId, autoLoad, reload]);

  return {
    mainTrack: data?.mainTrack || null,
    variants: data?.variants || [],
    preferredVariant: data?.preferredVariant || null,
    variantCount: data?.variants.length || 0,
    isLoading,
    error,
    reload,
    setPreferred,
    hasVariants: Boolean(data?.variants.length),
  };
}

/**
 * ✅ NEW: Lightweight hook for variant count only
 *
 * @param trackId - Track ID
 * @returns Number of variants (not including main track)
 */
export function useTrackVariantCount(trackId: string | null | undefined): number {
  const [count, setCount] = useState(() =>
    trackId ? (variantsCache.get(trackId)?.variants.length || 0) : 0
  );

  useEffect(() => {
    if (!trackId) {
      setCount(0);
      return;
    }

    // Check cache
    const cached = variantsCache.get(trackId);
    if (cached) {
      setCount(cached.variants.length);
    }

    // Subscribe to updates
    const unsubscribe = subscribeToTrackVariants(trackId, (result) => {
      setCount(result?.variants.length || 0);
    });

    // Fetch if not in cache
    fetchTrackVariants(trackId).catch(error => {
      logError('Failed to load variant count', error as Error, 'useTrackVariantCount', { trackId });
    });

    return () => {
      unsubscribe();
    };
  }, [trackId]);

  return count;
}
