import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface WaveformDB extends DBSchema {
  waveforms: {
    key: string;
    value: {
      url: string;
      peaks: number[];
      duration: number;
      generatedAt: number;
    };
  };
}

const DB_NAME = 'waveform-cache';
const STORE_NAME = 'waveforms';
const DB_VERSION = 1;
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class WaveformGenerator {
  private db: IDBPDatabase<WaveformDB> | null = null;
  private audioContext: AudioContext | null = null;

  async init() {
    try {
      this.db = await openDB<WaveformDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    } catch (error) {
      console.warn('IndexedDB not available, caching disabled:', error);
    }
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
    if (!this.db) return null;

    try {
      const cached = await this.db.get(STORE_NAME, url);
      
      if (cached && Date.now() - cached.generatedAt < CACHE_EXPIRY_MS) {
        return {
          peaks: cached.peaks,
          duration: cached.duration,
        };
      }

      // Remove expired cache
      if (cached) {
        await this.db.delete(STORE_NAME, url);
      }
    } catch (error) {
      console.warn('Cache read failed:', error);
    }

    return null;
  }

  private async saveToCache(url: string, peaks: number[]): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.put(STORE_NAME, {
        url,
        peaks,
        duration: peaks.length,
        generatedAt: Date.now(),
      }, url);
    } catch (error) {
      console.warn('Cache save failed:', error);
    }
  }

  async clearCache() {
    if (!this.db) return;
    
    try {
      const keys = await this.db.getAllKeys(STORE_NAME);
      for (const key of keys) {
        await this.db.delete(STORE_NAME, key);
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  dispose() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const waveformGenerator = new WaveformGenerator();
