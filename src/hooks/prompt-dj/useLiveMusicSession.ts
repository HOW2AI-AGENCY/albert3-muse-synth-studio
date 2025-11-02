/**
 * Live Music Session hook
 * Manages connection to Gemini Lyria API via Edge Functions
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { toast } from 'sonner';
import { createAudioBufferFromPCM } from '@/utils/audio/audio-buffer';
import { decodePCM } from '@/utils/audio/audio-encoding';
import type { PlaybackState, PromptData } from '@/components/prompt-dj/types';

export const useLiveMusicSession = () => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('stopped');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(async (
    initialPrompts: Array<{ text: string; weight: number }>
  ) => {
    try {
      logger.info('[PromptDJ] Connecting to Gemini Lyria API', 'useLiveMusicSession');
      
      // Создаем AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext({ sampleRate: 48000 });
        outputNodeRef.current = audioContextRef.current.createGain();
        outputNodeRef.current.connect(audioContextRef.current.destination);
      }

      setPlaybackState('loading');

      const { data, error } = await supabase.functions.invoke('prompt-dj-connect', {
        body: { initialPrompts }
      });

      if (error) throw error;

      setSessionId(data.sessionId);
      setIsConnected(true);
      
      // Подписываемся на SSE stream
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-dj-stream?sessionId=${data.sessionId}`;
      eventSourceRef.current = new EventSource(streamUrl);

      eventSourceRef.current.onmessage = async (event) => {
        const eventData = JSON.parse(event.data);
        
        if (eventData.type === 'audio-chunk') {
          await processAudioChunk(eventData.chunk);
        } else if (eventData.type === 'filtered-prompt') {
          logger.warn('[PromptDJ] Prompt filtered', 'useLiveMusicSession', {
            promptId: eventData.promptId
          });
        }
      };

      eventSourceRef.current.onerror = () => {
        logger.error('[PromptDJ] SSE connection error', new Error('SSE failed'), 'useLiveMusicSession');
        toast.error('Потеряно соединение с сервером');
        disconnect();
      };

      toast.success('Подключено к Prompt DJ!');
      logger.info('[PromptDJ] Connected', 'useLiveMusicSession', { sessionId: data.sessionId });

      return data.sessionId;
    } catch (error) {
      logger.error('[PromptDJ] Connection failed', error as Error, 'useLiveMusicSession');
      toast.error('Не удалось подключиться');
      setPlaybackState('stopped');
      throw error;
    }
  }, []);

  const processAudioChunk = useCallback(async (base64Chunk: string) => {
    if (!audioContextRef.current || !outputNodeRef.current) return;

    try {
      // Декодируем base64 → Uint8Array
      const pcmData = decodePCM(base64Chunk);

      // Создаем AudioBuffer
      const audioBuffer = createAudioBufferFromPCM(
        pcmData,
        audioContextRef.current
      );

      // Создаем source node
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(outputNodeRef.current);

      // Бесшовное воспроизведение
      if (nextStartTimeRef.current === 0) {
        const bufferTime = 2; // 2 секунды начальной буферизации
        nextStartTimeRef.current = audioContextRef.current.currentTime + bufferTime;
        setPlaybackState('playing');
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

    } catch (error) {
      logger.error('[PromptDJ] Audio processing failed', error as Error, 'useLiveMusicSession');
    }
  }, []);

  const updatePrompts = useCallback((prompts: Map<string, PromptData>) => {
    if (!sessionId) return;

    const activePrompts = Array.from(prompts.values())
      .filter(p => p.weight > 0 && !p.isFiltered)
      .map(p => ({ text: p.text, weight: p.weight }));

    // Debounced update через Edge Function
    supabase.functions.invoke('prompt-dj-update-prompts', {
      body: {
        sessionId,
        prompts: activePrompts
      }
    }).catch(error => {
      logger.error('[PromptDJ] Update prompts failed', error, 'useLiveMusicSession');
    });
  }, [sessionId]);

  const disconnect = useCallback(async () => {
    if (!sessionId) return;

    try {
      await supabase.functions.invoke('prompt-dj-disconnect', {
        body: { sessionId }
      });

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      setSessionId(null);
      setIsConnected(false);
      setPlaybackState('stopped');
      nextStartTimeRef.current = 0;

      toast.success('Отключено от Prompt DJ');
      logger.info('[PromptDJ] Disconnected', 'useLiveMusicSession');
    } catch (error) {
      logger.error('[PromptDJ] Disconnect failed', error as Error, 'useLiveMusicSession');
    }
  }, [sessionId]);

  return {
    sessionId,
    isConnected,
    playbackState,
    audioContext: audioContextRef.current,
    connect,
    updatePrompts,
    disconnect,
  };
};
