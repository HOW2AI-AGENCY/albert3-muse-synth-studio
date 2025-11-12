/**
 * DAW Responsive Wrapper
 *
 * Automatically switches between desktop and mobile DAW interfaces
 * based on screen size and device type.
 *
 * Breakpoints:
 * - Mobile: < 768px (< md)
 * - Desktop: >= 768px (>= md)
 *
 * @module pages/workspace/DAWResponsive
 */

import React from 'react';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { DAWEnhanced } from './DAWEnhanced';
import { DAWMobileLayout } from '@/components/daw/mobile/DAWMobileLayout';
import { logInfo } from '@/utils/logger';
import { useEffect } from 'react';

export const DAWResponsive: React.FC = () => {
  // md breakpoint = 768px (centralized config)
  const { isMobile } = useBreakpoints();

  useEffect(() => {
    logInfo('DAW interface rendered', 'DAWResponsive', {
      isMobile,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    });
  }, [isMobile]);

  // Render mobile version for small screens
  if (isMobile) {
    return <DAWMobileLayout />;
  }

  // Render desktop version for larger screens
  return <DAWEnhanced />;
};
