import { AudioEffect } from '@/services/studio/AudioEffectsEngine';

export interface FXPreset {
  name: string;
  description: string;
  category: 'vocals' | 'drums' | 'bass' | 'guitar' | 'synth' | 'master';
  effects: Omit<AudioEffect, 'id'>[];
}

export const FX_PRESETS: Record<string, FXPreset[]> = {
  vocals: [
    {
      name: 'Studio Vocal',
      description: 'Clean, professional vocal sound',
      category: 'vocals',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: -2, mid: 3, high: 2 },
        },
        {
          type: 'compressor',
          enabled: true,
          parameters: { threshold: -18, ratio: 4, attack: 5, release: 50 },
        },
        {
          type: 'reverb',
          enabled: true,
          parameters: { size: 45, decay: 30, mix: 15 },
        },
      ],
    },
    {
      name: 'Radio Voice',
      description: 'Broadcast-style vocal processing',
      category: 'vocals',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: -6, mid: 8, high: -2 },
        },
        {
          type: 'compressor',
          enabled: true,
          parameters: { threshold: -20, ratio: 6, attack: 2, release: 30 },
        },
      ],
    },
    {
      name: 'Vintage Warmth',
      description: 'Warm, analog-style vocals',
      category: 'vocals',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 2, mid: 1, high: -1 },
        },
        {
          type: 'distortion',
          enabled: true,
          parameters: { drive: 15 },
        },
        {
          type: 'reverb',
          enabled: true,
          parameters: { size: 60, decay: 50, mix: 20 },
        },
      ],
    },
  ],
  drums: [
    {
      name: 'Punchy Drums',
      description: 'Tight, aggressive drum sound',
      category: 'drums',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 4, mid: -2, high: 3 },
        },
        {
          type: 'compressor',
          enabled: true,
          parameters: { threshold: -10, ratio: 8, attack: 1, release: 20 },
        },
      ],
    },
    {
      name: 'Room Drums',
      description: 'Natural room ambience',
      category: 'drums',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 2, mid: 0, high: 2 },
        },
        {
          type: 'reverb',
          enabled: true,
          parameters: { size: 70, decay: 40, mix: 30 },
        },
      ],
    },
  ],
  bass: [
    {
      name: 'Fat Bass',
      description: 'Deep, rich bass tone',
      category: 'bass',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 6, mid: -1, high: -3 },
        },
        {
          type: 'compressor',
          enabled: true,
          parameters: { threshold: -15, ratio: 5, attack: 10, release: 40 },
        },
      ],
    },
    {
      name: 'Distorted Bass',
      description: 'Aggressive, saturated bass',
      category: 'bass',
      effects: [
        {
          type: 'distortion',
          enabled: true,
          parameters: { drive: 40 },
        },
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 3, mid: 2, high: -2 },
        },
      ],
    },
  ],
  guitar: [
    {
      name: 'Clean Guitar',
      description: 'Clear, defined guitar tone',
      category: 'guitar',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: -1, mid: 2, high: 3 },
        },
        {
          type: 'reverb',
          enabled: true,
          parameters: { size: 40, decay: 25, mix: 18 },
        },
      ],
    },
    {
      name: 'Lead Guitar',
      description: 'Soaring lead guitar sound',
      category: 'guitar',
      effects: [
        {
          type: 'distortion',
          enabled: true,
          parameters: { drive: 50 },
        },
        {
          type: 'delay',
          enabled: true,
          parameters: { time: 250, feedback: 35, mix: 25 },
        },
      ],
    },
  ],
  synth: [
    {
      name: 'Space Synth',
      description: 'Atmospheric, spacious synth',
      category: 'synth',
      effects: [
        {
          type: 'reverb',
          enabled: true,
          parameters: { size: 80, decay: 60, mix: 40 },
        },
        {
          type: 'delay',
          enabled: true,
          parameters: { time: 500, feedback: 40, mix: 30 },
        },
      ],
    },
    {
      name: 'Analog Warmth',
      description: 'Warm, vintage synth character',
      category: 'synth',
      effects: [
        {
          type: 'distortion',
          enabled: true,
          parameters: { drive: 20 },
        },
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 3, mid: 0, high: -2 },
        },
      ],
    },
  ],
  master: [
    {
      name: 'Mastering Chain',
      description: 'Professional mastering preset',
      category: 'master',
      effects: [
        {
          type: 'eq',
          enabled: true,
          parameters: { low: 1, mid: 0, high: 2 },
        },
        {
          type: 'compressor',
          enabled: true,
          parameters: { threshold: -6, ratio: 3, attack: 30, release: 100 },
        },
      ],
    },
  ],
};

export function getFXPresetsByCategory(category: string): FXPreset[] {
  return FX_PRESETS[category] || [];
}

export function getAllFXPresets(): FXPreset[] {
  return Object.values(FX_PRESETS).flat();
}
