// Simplified waveform generator without idb dependency

interface WaveformCache {
  url: string;
  peaks: number[];
  duration: number;
  generatedAt: number;
}

const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class WaveformGenerator {
  private cache: Map<string, WaveformCache> = new Map();
  private audioContext: AudioContext | null = null;

  async init() {
    // No initialization needed with Map-based cache
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  async generateWaveform(audioUrl: string, samplesPerPixel: number = 200): Promise<number[]> {
    // Check cache first
    const cached = await this.getFromCache(audioUrl);
    if (cached) {
      return this.resamplePeaks(cached.peaks, samplesPerPixel);
    }

    // Generate new waveform
    const peaks = await this.generatePeaks(audioUrl);
    
    // Cache the result
    await this.saveToCache(audioUrl, peaks);

    return this.resamplePeaks(peaks, samplesPerPixel);
  }

  private async generatePeaks(audioUrl: string): Promise<number[]> {
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    const audioContext = this.getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const rawData = audioBuffer.getChannelData(0);
    const samples = 10000; // Base resolution
    const blockSize = Math.floor(rawData.length / samples);
    const peaks: number[] = [];

    for (let i = 0; i < samples; i++) {
      const start = blockSize * i;
      let sum = 0;
      
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j]);
      }
      
      peaks.push(sum / blockSize);
    }

    // Normalize peaks to 0-1 range
    const max = Math.max(...peaks);
    return peaks.map(p => p / max);
  }

  private resamplePeaks(peaks: number[], targetSamples: number): number[] {
    if (peaks.length === targetSamples) return peaks;
    
    const resampled: number[] = [];
    const blockSize = peaks.length / targetSamples;
    
    for (let i = 0; i < targetSamples; i++) {
      const start = Math.floor(blockSize * i);
      const end = Math.floor(blockSize * (i + 1));
      let max = 0;
      
      for (let j = start; j < end; j++) {
        max = Math.max(max, peaks[j] || 0);
      }
      
      resampled.push(max);
    }
    
    return resampled;
  }

  private async getFromCache(url: string): Promise<{ peaks: number[]; duration: number } | null> {
    const cached = this.cache.get(url);
    
    if (cached && Date.now() - cached.generatedAt < CACHE_EXPIRY_MS) {
      return {
        peaks: cached.peaks,
        duration: cached.duration,
      };
    }

    // Remove expired cache
    if (cached) {
      this.cache.delete(url);
    }

    return null;
  }

  private async saveToCache(url: string, peaks: number[]): Promise<void> {
    this.cache.set(url, {
      url,
      peaks,
      duration: peaks.length,
      generatedAt: Date.now(),
    });
  }

  async clearCache() {
    this.cache.clear();
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.cache.clear();
  }
}

export const waveformGenerator = new WaveformGenerator();
