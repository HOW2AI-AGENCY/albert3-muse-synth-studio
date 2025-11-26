/**
 * ✅ Phase 2 - Step 1: Dynamic Offsets System
 * Hook для вычисления динамических отступов workspace на основе
 * высоты MiniPlayer и BottomTabBar с использованием ResizeObserver
 */

import { useEffect } from 'react';

export const useWorkspaceOffsets = () => {
  useEffect(() => {
    const updateOffsets = () => {
      // MiniPlayer height
      const miniPlayer = document.querySelector('[data-testid="mini-player"]') as HTMLElement;
      const miniPlayerHeight = miniPlayer ? miniPlayer.offsetHeight : 0;

      // BottomTabBar height (mobile navigation)
      const bottomTabBar = document.querySelector('[data-bottom-tab-bar="true"]') as HTMLElement;
      const bottomTabBarHeight = bottomTabBar ? bottomTabBar.offsetHeight : 0;

      // Set CSS variables
      document.documentElement.style.setProperty(
        '--mini-player-height',
        `${miniPlayerHeight}px`
      );
      document.documentElement.style.setProperty(
        '--bottom-tab-bar-height',
        `${bottomTabBarHeight}px`
      );

      // Combined offset for workspace main
      const totalOffset = miniPlayerHeight + bottomTabBarHeight;
      document.documentElement.style.setProperty(
        '--workspace-bottom-offset',
        `${totalOffset}px`
      );
    };

    // Initial calculation
    updateOffsets();

    // ResizeObserver для отслеживания изменений размеров
    const resizeObserver = new ResizeObserver(updateOffsets);

    // Наблюдаем за изменениями MiniPlayer и BottomTabBar
    const miniPlayerEl = document.querySelector('[data-testid="mini-player"]');
    const bottomTabBarEl = document.querySelector('[data-bottom-tab-bar="true"]');

    if (miniPlayerEl) {
      resizeObserver.observe(miniPlayerEl);
    }
    if (bottomTabBarEl) {
      resizeObserver.observe(bottomTabBarEl);
    }

    // Также обновляем при изменении размера окна
    window.addEventListener('resize', updateOffsets);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateOffsets);
    };
  }, []);
};
