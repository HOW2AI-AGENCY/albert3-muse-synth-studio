import { MusicStyle, StyleCategory } from './types';

export const jazzStyles: MusicStyle[] = [
  {
    id: 'smooth-jazz',
    name: 'Smooth Jazz',
    category: StyleCategory.JAZZ,
    description: 'Relaxed jazz with smooth melodies and grooves',
    tags: ['relaxed', 'melodic', 'groovy'],
    popularity: 7,
    relatedStyles: ['jazz-funk', 'fusion'],
    tempo: '70-100 BPM',
    mood: ['smooth', 'relaxed', 'cool']
  },
  {
    id: 'bebop',
    name: 'Bebop',
    category: StyleCategory.JAZZ,
    description: 'Fast-paced jazz with complex chord changes',
    tags: ['fast', 'complex', 'improvisation'],
    popularity: 6,
    relatedStyles: ['hard-bop', 'post-bop'],
    tempo: '140-180 BPM',
    mood: ['energetic', 'complex', 'intense']
  },
  {
    id: 'fusion',
    name: 'Fusion',
    category: StyleCategory.JAZZ,
    description: 'Blend of jazz with rock, funk, and R&B',
    tags: ['blend', 'rock', 'funk'],
    popularity: 7,
    relatedStyles: ['smooth-jazz', 'jazz-funk'],
    tempo: '90-130 BPM',
    mood: ['energetic', 'groovy', 'experimental']
  },
  {
    id: 'jazz-funk',
    name: 'Jazz-Funk',
    category: StyleCategory.JAZZ,
    description: 'Funky rhythms with jazz improvisation',
    tags: ['funky', 'groovy', 'improvisation'],
    popularity: 6,
    relatedStyles: ['fusion', 'smooth-jazz'],
    tempo: '90-120 BPM',
    mood: ['funky', 'groovy', 'energetic']
  },
  {
    id: 'swing',
    name: 'Swing',
    category: StyleCategory.JAZZ,
    description: 'Big band jazz with swinging rhythms',
    tags: ['big-band', 'swing', 'dance'],
    popularity: 6,
    relatedStyles: ['traditional-jazz', 'dixieland'],
    tempo: '110-140 BPM',
    mood: ['danceable', 'upbeat', 'joyful']
  },
  {
    id: 'cool-jazz',
    name: 'Cool Jazz',
    category: StyleCategory.JAZZ,
    description: 'Relaxed and smooth jazz style',
    tags: ['relaxed', 'smooth', 'melodic'],
    popularity: 6,
    relatedStyles: ['bebop', 'modal-jazz'],
    tempo: '80-110 BPM',
    mood: ['cool', 'relaxed', 'laid-back']
  },
  {
    id: 'modal-jazz',
    name: 'Modal Jazz',
    category: StyleCategory.JAZZ,
    description: 'Jazz based on modal scales',
    tags: ['modal', 'improvisation', 'experimental'],
    popularity: 5,
    relatedStyles: ['bebop', 'cool-jazz'],
    tempo: '90-130 BPM',
    mood: ['experimental', 'complex', 'introspective']
  },
  {
    id: 'free-jazz',
    name: 'Free Jazz',
    category: StyleCategory.JAZZ,
    description: 'Avant-garde jazz with free improvisation',
    tags: ['avant-garde', 'improvisation', 'experimental'],
    popularity: 4,
    relatedStyles: ['free-improvisation', 'experimental'],
    tempo: 'variable',
    mood: ['experimental', 'chaotic', 'intense']
  },
];
