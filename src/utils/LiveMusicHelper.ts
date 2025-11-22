/**
 * Live Music Helper
 * Bridge to the Lyria Live Music API.
 *
 * @version 2.0.2
 * @since 2025-11-17
 */
import { logger } from './logger';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { toast } from 'sonner';

export interface WeightedPrompt {
  id: string;
  text: string;
  weight: number;
  isFiltered?: boolean;
}

export type PlaybackState = 'idle' | 'connecting' | 'loading' | 'playing' | 'error';
export type RecordingState = 'idle' | 'recording' | 'encoding';
export type PlaybackCommand = 'PLAY' | 'PAUSE' | 'STOP';

export class LiveMusicHelper extends EventTarget {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private audioContext: AudioContext | null = null;
  private nextStartTime: number = 0;
  private bufferTime: number = 2;
  public playbackState: PlaybackState = 'idle';
  public recordingState: RecordingState = 'idle';
  private outputNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isFirstAudio: boolean = true;
  private recorderNode: AudioWorkletNode | null = null;
  public volume: number = 0.8;

  constructor() {
    super();
  }

  async connect(initialPrompts: WeightedPrompt[]): Promise<void> {
    try {
      this.setPlaybackState('connecting');
      type StartStreamResponse = { sessionId: string };
      type StartStreamBody = { initialPrompts: { text: string; weight: number }[] };
      const { data, error } = await SupabaseFunctions.invoke<StartStreamResponse, StartStreamBody>('prompt-dj-lyria-stream', {
        body: { initialPrompts: initialPrompts.map(p => ({ text: p.text, weight: p.weight })) }
      });
      if (error) throw error;
      this.sessionId = data?.sessionId ?? null;
      if (!this.sessionId) throw new Error('Missing sessionId from start stream response');

      this.audioContext = new AudioContext({ sampleRate: 48000 });
      this.outputNode = this.audioContext.createGain();
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;

      this.outputNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      this.outputNode.gain.value = 0.8;

      await this.audioContext.audioWorklet.addModule('/recorder.worklet.js');
      this.recorderNode = new AudioWorkletNode(this.audioContext, 'recorder-processor');
      this.outputNode.connect(this.recorderNode);

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'qycfsepwguaiwcquwwbw';
      const wsUrl = `wss://${projectId}.functions.supabase.co/functions/v1/prompt-dj-lyria-stream/stream?sessionId=${this.sessionId}`;
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = () => this.setPlaybackState('loading');
      this.ws.onmessage = (event) => this.handleWebSocketMessage(event);
      this.ws.onerror = () => {
        this.setPlaybackState('error');
        this.dispatchEvent(new CustomEvent('error', { detail: { message: 'WebSocket connection failed' } }));
      };
      this.ws.onclose = () => { if (this.playbackState === 'playing') this.setPlaybackState('idle'); };
    } catch (error) {
      this.setPlaybackState('error');
      throw error;
    }
  }

  async setWeightedPrompts(prompts: WeightedPrompt[]): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const activePrompts = prompts.filter(p => p.weight > 0 && !p.isFiltered);
    this.ws.send(JSON.stringify({
      type: 'prompts.update',
      prompts: activePrompts.map(p => ({ text: p.text, weight: p.weight }))
    }));
  }

  public setPlaybackControl(command: PlaybackCommand) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({
      type: 'playback.control',
      command: command,
    }));
  }

  private handleWebSocketMessage(event: MessageEvent): void {
    const message = JSON.parse(event.data);
    if (message.type === 'audio.chunk') this.processAudioChunk(message.chunk);
  }

  private async processAudioChunk(base64Audio: string): Promise<void> {
    if (!this.audioContext || !this.outputNode) return;
    try {
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const audioBuffer = await this.decodePCMAudio(bytes);
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
      this.dispatchEvent(new CustomEvent('audio-level', { detail: { level: this.calculateAudioLevel(audioBuffer) } }));
    } catch (error) {
      logger.error('[LiveMusicHelper] Audio processing error', error as Error, 'LiveMusicHelper');
    }
  }

  private async decodePCMAudio(pcmData: Uint8Array): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error('AudioContext not initialized');
    const sampleRate = 48000;
    const numChannels = 2;
    const numSamples = pcmData.length / 2 / numChannels;
    const audioBuffer = this.audioContext.createBuffer(numChannels, numSamples, sampleRate);
    const dataView = new DataView(pcmData.buffer);
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    for (let i = 0; i < numSamples; i++) {
      const offset = i * 4;
      leftChannel[i] = dataView.getInt16(offset, true) / 32768.0;
      rightChannel[i] = dataView.getInt16(offset + 2, true) / 32768.0;
    }
    return audioBuffer;
  }

  private calculateAudioLevel(audioBuffer: AudioBuffer): number {
    const leftChannel = audioBuffer.getChannelData(0);
    let sum = 0;
    for (let i = 0; i < leftChannel.length; i++) sum += Math.abs(leftChannel[i]);
    return Math.min(1.0, (sum / leftChannel.length) * 10);
  }

  startRecording(): void {
    if (this.recordingState === 'idle' && this.playbackState === 'playing') {
      this.recorderNode?.port.postMessage({ command: 'clear' });
      this.setRecordingState('recording');
    }
  }

  stopRecording(encode: boolean = true): void {
    if (this.recordingState === 'recording') {
      this.setRecordingState(encode ? 'encoding' : 'idle');
      if (encode) {
        this.recorderNode?.port.postMessage({ command: 'getBuffer' });
        this.recorderNode!.port.onmessage = (event) => {
            const { buffer } = event.data;
            const stereoBuffer = this.interleave(buffer, buffer);
            this.encodeWav(stereoBuffer).then(blob => {
                this.dispatchEvent(new CustomEvent('recording-complete', { detail: { blob } }));
                this.setRecordingState('idle');
            });
        };
      } else {
        this.setRecordingState('idle');
      }
    }
  }

  async setReferenceAudio(blob: Blob, weight: number): Promise<void> {
    const base64data = await this.blobToBase64(blob);
    const base64EncodedAudio = base64data.split(',')[1];

    logger.info('[LiveMusicHelper] Setting reference audio', 'LiveMusicHelper', { weight, mimeType: blob.type });
    this.ws?.send(JSON.stringify({
      type: 'reference.update',
      audio: { data: base64EncodedAudio, mimeType: blob.type },
      weight
    }));
    toast.success('Референсное аудио отправлено!');
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
  }

  private interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);
    let index = 0, inputIndex = 0;
    while (index < length) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }
    return result;
  }

  private async encodeWav(samples: Float32Array): Promise<Blob> {
    const sampleRate = this.audioContext?.sampleRate || 48000;
    const channels = 2;
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  private writeString(view: DataView, offset: number, string: string): void {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  private setPlaybackState(state: PlaybackState): void {
    this.playbackState = state;
    this.dispatchEvent(new CustomEvent('playback-state-changed', { detail: { state } }));
  }

  private setRecordingState(state: RecordingState): void {
    this.recordingState = state;
    this.dispatchEvent(new CustomEvent('recording-state-changed', { detail: { state } }));
  }

  getPlaybackState(): PlaybackState { return this.playbackState; }

  public setVolume(volume: number): void {
    this.volume = volume;
    if (this.outputNode) {
      this.outputNode.gain.value = this.volume;
    }
  }

  getAnalyserData(): { frequencyData: Uint8Array, waveformData: Uint8Array } | null {
    if (!this.analyserNode) return null;
    const bufferLength = this.analyserNode.frequencyBinCount;
    const frequencyData = new Uint8Array(bufferLength);
    const waveformData = new Uint8Array(bufferLength);
    this.analyserNode.getByteFrequencyData(frequencyData);
    this.analyserNode.getByteTimeDomainData(waveformData);
    return { frequencyData, waveformData };
  }

  disconnect(): void {
    if (this.ws) this.ws.close();
    if (this.audioContext) this.audioContext.close();
    this.stopRecording(false);
    this.nextStartTime = 0;
    this.isFirstAudio = true;
    this.setPlaybackState('idle');
  }
}
