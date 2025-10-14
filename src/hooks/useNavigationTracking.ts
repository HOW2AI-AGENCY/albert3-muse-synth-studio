/**
 * ✅ Phase 4: Navigation Analytics Hook
 * Відстежує всі переходи користувача по додатку
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AnalyticsService } from '@/services/analytics.service';
import { logger } from '@/utils/logger';

export const useNavigationTracking = () => {
  const location = useLocation();
  const previousLocationRef = useRef<string | null>(null);
  const navigationStartRef = useRef<number>(Date.now());

  useEffect(() => {
    const currentPath = location.pathname;
    const previousPath = previousLocationRef.current;
    const navigationEnd = Date.now();
    const duration = previousPath ? navigationEnd - navigationStartRef.current : 0;

    // Log navigation
    logger.info('Page navigation', 'NavigationTracking', {
      from: previousPath,
      to: currentPath,
      duration,
      search: location.search,
      hash: location.hash,
    });

    // Track in analytics
    AnalyticsService.recordEvent({
      eventType: 'page_view',
      metadata: {
        path: currentPath,
        previousPath: previousPath || null,
        duration,
        search: location.search,
        hash: location.hash,
        timestamp: navigationEnd,
      },
    }).catch((error) => {
      logger.warn('Failed to track navigation', 'NavigationTracking', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    // Update refs for next navigation
    previousLocationRef.current = currentPath;
    navigationStartRef.current = navigationEnd;
  }, [location]);
};
