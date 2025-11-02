/**
 * Generation State Machine Hook
 * Управляет состояниями генерации музыки с предсказуемыми переходами
 * Phase 1.1: Critical Logic Improvements
 */

import { useReducer, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

// State types
export type GenerationState =
  | { type: 'idle' }
  | { type: 'validating'; params: GenerationParams }
  | { type: 'submitting'; params: GenerationParams }
  | { type: 'lyrics_selection'; trackId: string; variants: LyricsVariant[] }
  | { type: 'generating'; trackId: string; progress: number; stage?: string }
  | { type: 'completed'; trackId: string; title: string }
  | { type: 'failed'; error: string; retryable: boolean; trackId?: string };

// Event types
export type GenerationEvent =
  | { type: 'SUBMIT'; params: GenerationParams }
  | { type: 'VALIDATION_SUCCESS'; trackId: string }
  | { type: 'LYRICS_SELECTION'; trackId: string; variants: LyricsVariant[] }
  | { type: 'LYRICS_SELECTED'; lyrics: string }
  | { type: 'PROGRESS'; percent: number; stage?: string }
  | { type: 'COMPLETED'; trackId: string; title: string }
  | { type: 'FAILED'; error: string; retryable?: boolean }
  | { type: 'RETRY' }
  | { type: 'RESET' };

export interface GenerationParams {
  prompt: string;
  lyrics?: string;
  provider: 'suno' | 'mureka';
  [key: string]: any;
}

export interface LyricsVariant {
  id: string;
  title: string;
  content: string;
}

// Reducer function
function generationReducer(state: GenerationState, event: GenerationEvent): GenerationState {
  logger.info(`[StateMachine] ${state.type} + ${event.type}`, 'useGenerationStateMachine');

  switch (event.type) {
    case 'SUBMIT':
      if (state.type !== 'idle' && state.type !== 'failed') {
        logger.warn('[StateMachine] Cannot submit while not idle', 'useGenerationStateMachine');
        return state;
      }
      return { type: 'submitting', params: event.params };

    case 'VALIDATION_SUCCESS':
      if (state.type !== 'submitting') return state;
      return { 
        type: 'generating', 
        trackId: event.trackId, 
        progress: 0,
        stage: 'initializing'
      };

    case 'LYRICS_SELECTION':
      if (state.type !== 'submitting') return state;
      return {
        type: 'lyrics_selection',
        trackId: event.trackId,
        variants: event.variants,
      };

    case 'LYRICS_SELECTED':
      if (state.type !== 'lyrics_selection') return state;
      return {
        type: 'generating',
        trackId: state.trackId,
        progress: 10,
        stage: 'composing_music'
      };

    case 'PROGRESS':
      if (state.type !== 'generating') return state;
      return {
        ...state,
        progress: event.percent,
        stage: event.stage || state.stage,
      };

    case 'COMPLETED':
      if (state.type !== 'generating') return state;
      return {
        type: 'completed',
        trackId: event.trackId,
        title: event.title,
      };

    case 'FAILED':
      return {
        type: 'failed',
        error: event.error,
        retryable: event.retryable ?? true,
        trackId: state.type === 'generating' ? state.trackId : undefined,
      };

    case 'RETRY':
      if (state.type !== 'failed' || !state.retryable) return state;
      return { type: 'idle' };

    case 'RESET':
      return { type: 'idle' };

    default:
      return state;
  }
}

const initialState: GenerationState = { type: 'idle' };

export const useGenerationStateMachine = () => {
  const [state, dispatch] = useReducer(generationReducer, initialState);
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  // Auto-subscribe to realtime updates when entering "generating" state
  useEffect(() => {
    if (state.type !== 'generating') {
      // Cleanup subscription if not generating
      if (subscriptionRef.current) {
        logger.info('[StateMachine] Cleaning up subscription', 'useGenerationStateMachine');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
      return;
    }

    const { trackId } = state;
    logger.info('[StateMachine] Setting up realtime subscription', 'useGenerationStateMachine', { trackId });

    const channel = supabase
      .channel(`track_generation_${trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          const track = payload.new as any;

          logger.info('[StateMachine] Realtime update', 'useGenerationStateMachine', {
            trackId,
            status: track.status,
            stage: track.metadata?.stage,
          });

          if (track.status === 'completed') {
            dispatch({
              type: 'COMPLETED',
              trackId: track.id,
              title: track.title || 'Untitled',
            });
          } else if (track.status === 'failed') {
            dispatch({
              type: 'FAILED',
              error: track.error_message || 'Generation failed',
              retryable: true,
            });
          } else if (track.status === 'processing') {
            const progress = track.metadata?.progress_percent || 50;
            const stage = track.metadata?.stage_description || 'processing';
            dispatch({
              type: 'PROGRESS',
              percent: progress,
              stage,
            });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Cleanup on unmount or state change
    return () => {
      logger.info('[StateMachine] Unsubscribing from channel', 'useGenerationStateMachine', { trackId });
      channel.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [state.type, state.type === 'generating' ? state.trackId : null]);

  // Reset to idle after completion (auto-cleanup after 5 seconds)
  useEffect(() => {
    if (state.type === 'completed') {
      const timer = setTimeout(() => {
        logger.info('[StateMachine] Auto-reset after completion', 'useGenerationStateMachine');
        dispatch({ type: 'RESET' });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.type]);

  const send = useCallback((event: GenerationEvent) => {
    dispatch(event);
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    send,
    reset,
    isGenerating: state.type === 'submitting' || state.type === 'generating',
    isIdle: state.type === 'idle',
    needsLyricsSelection: state.type === 'lyrics_selection',
  };
};
