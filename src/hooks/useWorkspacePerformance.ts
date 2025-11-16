/**
 * ✅ Phase 6: Workspace Performance Optimization Hook
 * Мониторинг и оптимизация производительности workspace
 */

import { useEffect, useState, useCallback } from 'react';
import { useResponsive } from './useResponsive';

interface PerformanceMetrics {
  renderTime: number;
  fps: number;
  memoryUsage: number;
  isOptimal: boolean;
}

export const useWorkspacePerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    fps: 60,
    memoryUsage: 0,
    isOptimal: true,
  });
  const { isMobile } = useResponsive();

  // Measure render performance
  const measureRenderTime = useCallback(() => {
    const startTime = performance.now();
    
    requestAnimationFrame(() => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      setMetrics(prev => ({
        ...prev,
        renderTime,
        isOptimal: renderTime < 16.67, // 60fps threshold
      }));
    });
  }, []);

  // Monitor FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        
        setMetrics(prev => ({
          ...prev,
          fps,
          isOptimal: fps >= 55, // Allow 5fps drop
        }));

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    // Skip FPS monitoring on mobile for better performance
    if (!isMobile) {
      animationFrameId = requestAnimationFrame(measureFPS);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isMobile]);

  // Monitor memory (if available)
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = memory.usedJSHeapSize / 1048576; // Convert to MB
        
        setMetrics(prev => ({
          ...prev,
          memoryUsage: usedMB,
          isOptimal: prev.isOptimal && usedMB < 100, // Alert if over 100MB
        }));
      }
    };

    const interval = setInterval(measureMemory, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    measureRenderTime,
    isPerformanceOptimal: metrics.isOptimal,
  };
};
