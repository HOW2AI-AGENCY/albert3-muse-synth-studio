/**
 * Prompt DJ Helper
 * Manages WebSocket connection and audio streaming for Gemini Lyria
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { logger } from './logger';
import { supabase } from '@/integrations/supabase/client';

export interface WeightedPrompt {
  id: string;
  text: string;
  weight: number;
  isFiltered?: boolean;
}

export type PlaybackState = 'idle' | 'connecting' | 'loading' | 'playing' | 'error';

export class PromptDJHelper extends EventTarget {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private bufferTime: number = 2; // 2 seconds buffer
  private playbackState: PlaybackState = 'idle';
  private outputNode: GainNode | null = null;
  private isFirstAudio: boolean = true;

  constructor() {
    super();
  }

  /**
   * Connect to Gemini Lyria Live Music API
   */
  async connect(initialPrompts: WeightedPrompt[]): Promise<void> {
    try {
      this.setPlaybackState('connecting');

      // Create session
      const { data, error } = await supabase.functions.invoke('prompt-dj-lyria-stream', {
        body: {
          initialPrompts: initialPrompts.map(p => ({ text: p.text, weight: p.weight }))
        }
      });

      if (error) throw error;

      this.sessionId = data.sessionId;
      logger.info('[PromptDJHelper] Session created', 'PromptDJHelper', { sessionId: this.sessionId });

      // Initialize Web Audio API
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.outputNode = this.audioContext.createGain();
      this.outputNode.connect(this.audioContext.destination);
      this.outputNode.gain.value = 0.8;

      // Establish WebSocket connection
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'qycfsepwguaiwcquwwbw';
      const wsUrl = `wss://${projectId}.functions.supabase.co/functions/v1/prompt-dj-lyria-stream/stream?sessionId=${this.sessionId}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        logger.info('[PromptDJHelper] WebSocket connected', 'PromptDJHelper');
        this.setPlaybackState('loading');
      };

      this.ws.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.ws.onerror = (error) => {
        logger.error('[PromptDJHelper] WebSocket error', error as Error, 'PromptDJHelper');
        this.setPlaybackState('error');
        this.dispatchEvent(new CustomEvent('error', { 
          detail: { message: 'WebSocket connection failed' }
        }));
      };

      this.ws.onclose = () => {
        logger.info('[PromptDJHelper] WebSocket closed', 'PromptDJHelper');
        if (this.playbackState === 'playing') {
          this.setPlaybackState('idle');
        }
      };

    } catch (error) {
      logger.error('[PromptDJHelper] Connect error', error as Error, 'PromptDJHelper');
      this.setPlaybackState('error');
      throw error;
    }
  }

  /**
   * Update weighted prompts
   */
  async updatePrompts(prompts: WeightedPrompt[]): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('[PromptDJHelper] WebSocket not ready', 'PromptDJHelper');
      return;
    }

    const activePrompts = prompts.filter(p => p.weight > 0 && !p.isFiltered);

    this.ws.send(JSON.stringify({
      type: 'prompts.update',
      prompts: activePrompts.map(p => ({ text: p.text, weight: p.weight }))
    }));

    logger.info(`[PromptDJHelper] Prompts updated: ${activePrompts.length}`, 'PromptDJHelper');
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'session.created':
          logger.info('[PromptDJHelper] Session confirmed', 'PromptDJHelper');
          break;

        case 'audio.chunk':
          this.processAudioChunk(message.chunk);
          break;

        case 'prompt.filtered':
          this.dispatchEvent(new CustomEvent('filtered-prompt', {
            detail: { promptId: message.promptId, reason: message.reason }
          }));
          break;

        case 'error':
          logger.error('[PromptDJHelper] Server error', new Error(message.message), 'PromptDJHelper');
          this.setPlaybackState('error');
          break;

        default:
          logger.warn('[PromptDJHelper] Unknown message type', 'PromptDJHelper', { type: message.type });
      }
    } catch (error) {
      logger.error('[PromptDJHelper] Message parsing error', error as Error, 'PromptDJHelper');
    }
  }

  /**
   * Process audio chunk from server
   */
  private async processAudioChunk(base64Audio: string): Promise<void> {
    if (!this.audioContext || !this.outputNode) return;

    try {
      // Decode base64 to Uint8Array
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Decode PCM audio (48kHz, 16-bit, stereo)
      const audioBuffer = await this.decodePCMAudio(bytes);

      // Queue for playback
      if (this.isFirstAudio) {
        this.nextStartTime = this.audioContext.currentTime + this.bufferTime;
        this.isFirstAudio = false;
        this.setPlaybackState('playing');
      }

      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      source.start(this.nextStartTime);

      this.nextStartTime += audioBuffer.duration;

      // Dispatch audio level for visualization
      this.dispatchEvent(new CustomEvent('audio-level', {
        detail: { level: this.calculateAudioLevel(audioBuffer) }
      }));

    } catch (error) {
      logger.error('[PromptDJHelper] Audio processing error', error as Error, 'PromptDJHelper');
    }
  }

  /**
   * Decode raw PCM audio data
   */
  private async decodePCMAudio(pcmData: Uint8Array): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');

    const sampleRate = 48000;
    const numChannels = 2;
    const numSamples = pcmData.length / 2 / numChannels;

    const audioBuffer = this.audioContext.createBuffer(numChannels, numSamples, sampleRate);

    // Convert 16-bit PCM to float32
    const dataView = new DataView(pcmData.buffer);
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);

    for (let i = 0; i < numSamples; i++) {
      const offset = i * 4; // 2 bytes per sample * 2 channels
      leftChannel[i] = dataView.getInt16(offset, true) / 32768.0;
      rightChannel[i] = dataView.getInt16(offset + 2, true) / 32768.0;
    }

    return audioBuffer;
  }

  /**
   * Calculate audio level for visualization
   */
  private calculateAudioLevel(audioBuffer: AudioBuffer): number {
    const leftChannel = audioBuffer.getChannelData(0);
    let sum = 0;

    for (let i = 0; i < leftChannel.length; i++) {
      sum += Math.abs(leftChannel[i]);
    }

    return Math.min(1.0, (sum / leftChannel.length) * 10);
  }

  /**
   * Set playback state and notify listeners
   */
  private setPlaybackState(state: PlaybackState): void {
    this.playbackState = state;
    this.dispatchEvent(new CustomEvent('playback-state-changed', {
      detail: { state }
    }));
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    if (this.outputNode) {
      this.outputNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.nextStartTime = 0;
    this.isFirstAudio = true;
    this.setPlaybackState('idle');
  }
}
