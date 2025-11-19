/**
 * Hook для автоматического обновления истекших audio URLs
 * SPRINT 28: PLAYER-FIX-001
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { logInfo, logError } from '@/utils/logger';

interface UseAudioUrlRefreshOptions {
  trackId: string | null;
  audioUrl: string | null;
  onUrlRefreshed?: (newUrl: string) => void;
}

const URL_EXPIRY_CHECK_INTERVAL = 1000 * 60 * 60; // 1 час

/**
 * Проверяет, истек ли срок действия signed URL
 */
function isUrlExpired(url: string): boolean {
  if (!url.includes('token=')) return false;
  
  try {
    const urlObj = new URL(url);
    const expiresAt = urlObj.searchParams.get('exp');
    
    if (!expiresAt) return false;
    
    const expiryTime = parseInt(expiresAt) * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    // Обновляем за 1 час до истечения
    return timeUntilExpiry < 60 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Auto-refresh hook для audio URLs
 */
export function useAudioUrlRefresh({ 
  trackId, 
  audioUrl, 
  onUrlRefreshed 
}: UseAudioUrlRefreshOptions) {
  const refreshInProgressRef = useRef(false);
  const lastCheckRef = useRef<number>(0);

  useEffect(() => {
    if (!trackId || !audioUrl) return;

    const checkAndRefresh = async () => {
      // ✅ FIX: Не проверяем чаще 1 раза в час для того же URL
      const now = Date.now();
      if (now - lastCheckRef.current < URL_EXPIRY_CHECK_INTERVAL) {
        return;
      }

      if (refreshInProgressRef.current) return;
      
      // ✅ FIX: Не проверяем, если URL не истек
      if (!isUrlExpired(audioUrl)) {
        lastCheckRef.current = now; // Обновляем время последней проверки
        return;
      }

      logInfo('Audio URL expired, refreshing...', 'useAudioUrlRefresh', { trackId });
      refreshInProgressRef.current = true;

      try {
        const { data, error } = await SupabaseFunctions.invoke('refresh-track-audio', {
          body: { trackId, mode: 'production' }
        });

        if (error) throw error;

        if (data?.refreshed?.audio_url) {
          logInfo('Audio URL refreshed successfully', 'useAudioUrlRefresh', { 
            trackId,
            newUrl: data.refreshed.audio_url.substring(0, 60) + '...'
          });
          
          onUrlRefreshed?.(data.refreshed.audio_url);
        }
      } catch (error) {
        logError('Failed to refresh audio URL', error as Error, 'useAudioUrlRefresh', { trackId });
      } finally {
        refreshInProgressRef.current = false;
      }
    };

    // ✅ FIX: НЕ проверяем при монтировании (избыточно)
    // Только периодическая проверка каждый час
    const interval = setInterval(checkAndRefresh, URL_EXPIRY_CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, [trackId, audioUrl, onUrlRefreshed]);
}
