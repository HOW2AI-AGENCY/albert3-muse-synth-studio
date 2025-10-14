/**
 * ✅ Phase 4: UI Interaction Tracking Hook
 * Відстежує взаємодії користувача з UI елементами
 */

import { useCallback } from 'react';
import { AnalyticsService } from '@/services/analytics.service';
import { logger } from '@/utils/logger';

export type UIInteractionType = 
  | 'click'
  | 'hover'
  | 'scroll'
  | 'input'
  | 'submit'
  | 'toggle'
  | 'expand'
  | 'collapse';

export interface TrackUIInteractionParams {
  type: UIInteractionType;
  component: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export const useUIInteractionTracking = () => {
  const trackInteraction = useCallback(async (params: TrackUIInteractionParams) => {
    const { type, component, action, metadata } = params;

    // Debounce rapidly repeated interactions (like scroll)
    const shouldDebounce = type === 'scroll' || type === 'hover';
    
    if (shouldDebounce) {
      // Skip some events to reduce noise
      if (Math.random() > 0.1) return; // Sample only 10% of scroll/hover events
    }

    logger.debug(`UI interaction: ${type}`, 'UIInteractionTracking', {
      component,
      action,
      ...metadata,
    });

    try {
      await AnalyticsService.recordEvent({
        eventType: `ui_${type}`,
        metadata: {
          component,
          action: action || null,
          timestamp: Date.now(),
          ...metadata,
        },
      });
    } catch (error) {
      // Silent fail - don't disrupt user experience
      logger.debug('Failed to track UI interaction', 'UIInteractionTracking', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const trackClick = useCallback((component: string, action?: string, metadata?: Record<string, unknown>) => {
    trackInteraction({ type: 'click', component, action, metadata });
  }, [trackInteraction]);

  const trackToggle = useCallback((component: string, state: boolean, metadata?: Record<string, unknown>) => {
    trackInteraction({ 
      type: 'toggle', 
      component, 
      action: state ? 'on' : 'off',
      metadata 
    });
  }, [trackInteraction]);

  const trackExpand = useCallback((component: string, expanded: boolean, metadata?: Record<string, unknown>) => {
    trackInteraction({ 
      type: expanded ? 'expand' : 'collapse', 
      component, 
      metadata 
    });
  }, [trackInteraction]);

  const trackInput = useCallback((component: string, fieldName: string, metadata?: Record<string, unknown>) => {
    trackInteraction({ 
      type: 'input', 
      component, 
      action: fieldName,
      metadata 
    });
  }, [trackInteraction]);

  const trackSubmit = useCallback((component: string, formName: string, metadata?: Record<string, unknown>) => {
    trackInteraction({ 
      type: 'submit', 
      component, 
      action: formName,
      metadata 
    });
  }, [trackInteraction]);

  return {
    trackInteraction,
    trackClick,
    trackToggle,
    trackExpand,
    trackInput,
    trackSubmit,
  };
};
