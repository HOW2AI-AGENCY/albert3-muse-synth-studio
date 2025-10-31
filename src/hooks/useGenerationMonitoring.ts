import { useEffect, useRef } from 'react';
import { metricsCollector } from '@/utils/monitoring/metrics';

interface UseGenerationMonitoringProps {
  trackId?: string;
  provider?: 'suno' | 'mureka';
  status?: 'pending' | 'processing' | 'completed' | 'failed';
}

export const useGenerationMonitoring = ({
  trackId,
  provider,
  status
}: UseGenerationMonitoringProps) => {
  const startTimeRef = useRef<number | null>(null);
  const previousStatusRef = useRef<string | undefined>(status);

  useEffect(() => {
    if (!trackId || !provider || !status) return;

    // Track when generation starts
    if (status === 'processing' && previousStatusRef.current !== 'processing') {
      startTimeRef.current = Date.now();
      metricsCollector.trackGeneration({
        trackId,
        provider,
        status: 'started',
        timestamp: Date.now()
      });
    }

    // Track when generation completes
    if (status === 'completed' && previousStatusRef.current !== 'completed') {
      const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
      metricsCollector.trackGeneration({
        trackId,
        provider,
        status: 'completed',
        duration,
        timestamp: Date.now()
      });
    }

    // Track when generation fails
    if (status === 'failed' && previousStatusRef.current !== 'failed') {
      const duration = startTimeRef.current ? Date.now() - startTimeRef.current : undefined;
      metricsCollector.trackGeneration({
        trackId,
        provider,
        status: 'failed',
        duration,
        timestamp: Date.now()
      });
    }

    previousStatusRef.current = status;
  }, [trackId, provider, status]);

  return {
    startTime: startTimeRef.current,
    getDuration: () => startTimeRef.current ? Date.now() - startTimeRef.current : 0
  };
};
