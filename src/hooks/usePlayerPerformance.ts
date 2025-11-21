/**
 * Hook для мониторинга производительности плеера
 * Отслеживает FPS, время рендеринга и другие метрики
 * 
 * @returns {object} Метрики производительности
 * 
 * TODO: Добавить измерение времени загрузки аудио
 * FIXME: На некоторых Android performance.now() может быть неточным
 */

import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

interface PerformanceMetrics {
  fps: number;
  loadTime: number;
  renderCount: number;
}

export const usePlayerPerformance = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    loadTime: 0,
    renderCount: 0,
  });

  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    // ✅ Измерение FPS для отслеживания производительности
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      const elapsed = currentTime - lastTime;

      // Обновление каждую секунду
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount * 1000) / elapsed);
        setMetrics(prev => ({ ...prev, fps }));
        
        // ✅ Логирование если FPS < 30 (проблема производительности)
        if (fps < 30) {
          logger.warn('Low FPS detected in player', 'usePlayerPerformance', { 
            fps,
            elapsed,
            frameCount
          });
        }
        
        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(measureFPS);
    };

    // Запуск мониторинга
    animationId = requestAnimationFrame(measureFPS);

    // ✅ Cleanup при размонтировании
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return metrics;
};
