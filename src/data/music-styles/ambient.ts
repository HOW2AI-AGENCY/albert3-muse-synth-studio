import { MusicStyle, StyleCategory } from './types';

export const ambientStyles: MusicStyle[] = [
  {
    id: 'ambient',
    name: 'Ambient',
    category: StyleCategory.AMBIENT,
    description: 'Atmospheric music with focus on tone and mood',
    tags: ['atmospheric', 'tone', 'mood'],
    popularity: 7,
    relatedStyles: ['drone', 'chillout'],
    tempo: 'slow',
    mood: ['calm', 'meditative', 'ethereal']
  },
  {
    id: 'chillout',
    name: 'Chillout',
    category: StyleCategory.AMBIENT,
    description: 'Relaxed electronic music for chilling',
    tags: ['relaxed', 'electronic', 'downtempo'],
    popularity: 7,
    relatedStyles: ['ambient', 'downtempo'],
    tempo: 'slow',
    mood: ['relaxed', 'calm', 'peaceful']
  },
  {
    id: 'drone',
    name: 'Drone',
    category: StyleCategory.AMBIENT,
    description: 'Sustained tones and minimal harmonic changes',
    tags: ['sustained', 'minimal', 'experimental'],
    popularity: 5,
    relatedStyles: ['ambient', 'experimental'],
    tempo: 'very slow',
    mood: ['hypnotic', 'minimal', 'meditative']
  },
  {
    id: 'dark-ambient',
    name: 'Dark Ambient',
    category: StyleCategory.AMBIENT,
    description: 'Atmospheric music with dark and eerie tones',
    tags: ['dark', 'atmospheric', 'eerie'],
    popularity: 5,
    relatedStyles: ['ambient', 'industrial'],
    tempo: 'slow',
    mood: ['dark', 'mysterious', 'intense']
  },
  {
    id: 'new-age',
    name: 'New Age',
    category: StyleCategory.AMBIENT,
    description: 'Relaxing music often used for meditation and healing',
    tags: ['relaxing', 'meditation', 'healing'],
    popularity: 6,
    relatedStyles: ['ambient', 'chillout'],
    tempo: 'slow',
    mood: ['calm', 'peaceful', 'uplifting']
  },
];
