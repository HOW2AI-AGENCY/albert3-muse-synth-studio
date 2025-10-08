import { MusicStyle, StyleCategory } from './types';

export const rockStyles: MusicStyle[] = [
  {
    id: 'classic-rock',
    name: 'Classic Rock',
    category: StyleCategory.ROCK,
    description: 'Timeless rock with guitar riffs and strong vocals',
    tags: ['guitar', 'riffs', 'timeless'],
    popularity: 9,
    relatedStyles: ['hard-rock', 'blues-rock'],
    tempo: '100-130 BPM',
    mood: ['energetic', 'powerful', 'rebellious']
  },
  {
    id: 'indie-rock',
    name: 'Indie Rock',
    category: StyleCategory.ROCK,
    description: 'Alternative rock with artistic and creative approach',
    tags: ['alternative', 'artistic', 'creative'],
    popularity: 8,
    relatedStyles: ['alternative-rock', 'post-punk'],
    tempo: '110-140 BPM',
    mood: ['introspective', 'artistic', 'energetic']
  },
  {
    id: 'punk',
    name: 'Punk Rock',
    category: StyleCategory.ROCK,
    description: 'Fast, aggressive rock with DIY ethos',
    tags: ['fast', 'aggressive', 'rebellious'],
    popularity: 7,
    relatedStyles: ['hardcore-punk', 'post-punk'],
    tempo: '140-180 BPM',
    mood: ['rebellious', 'aggressive', 'raw']
  },
  {
    id: 'metal',
    name: 'Metal',
    category: StyleCategory.ROCK,
    description: 'Heavy distorted guitars with powerful vocals',
    tags: ['heavy', 'distorted', 'powerful'],
    popularity: 8,
    relatedStyles: ['thrash-metal', 'death-metal'],
    tempo: '120-160 BPM',
    mood: ['aggressive', 'powerful', 'dark']
  },
  {
    id: 'grunge',
    name: 'Grunge',
    category: StyleCategory.ROCK,
    description: 'Raw alternative rock from Seattle scene',
    tags: ['raw', 'alternative', 'distorted'],
    popularity: 7,
    relatedStyles: ['alternative-rock', 'punk'],
    tempo: '100-130 BPM',
    mood: ['angsty', 'raw', 'melancholic']
  },
  {
    id: 'progressive-rock',
    name: 'Progressive Rock',
    category: StyleCategory.ROCK,
    description: 'Complex compositions with experimental elements',
    tags: ['complex', 'experimental', 'instrumental'],
    popularity: 6,
    relatedStyles: ['art-rock', 'psychedelic-rock'],
    tempo: '60-140 BPM (variable)',
    mood: ['complex', 'epic', 'experimental']
  },
  {
    id: 'hard-rock',
    name: 'Hard Rock',
    category: StyleCategory.ROCK,
    description: 'Aggressive rock with heavy guitar riffs',
    tags: ['heavy', 'aggressive', 'riffs'],
    popularity: 8,
    relatedStyles: ['metal', 'classic-rock'],
    tempo: '110-140 BPM',
    mood: ['powerful', 'aggressive', 'energetic']
  },
  {
    id: 'alternative-rock',
    name: 'Alternative Rock',
    category: StyleCategory.ROCK,
    description: 'Non-mainstream rock with diverse influences',
    tags: ['alternative', 'diverse', 'modern'],
    popularity: 8,
    relatedStyles: ['indie-rock', 'grunge'],
    tempo: '100-140 BPM',
    mood: ['varied', 'modern', 'creative']
  },
  {
    id: 'psychedelic-rock',
    name: 'Psychedelic Rock',
    category: StyleCategory.ROCK,
    description: 'Experimental rock with surreal elements',
    tags: ['experimental', 'surreal', 'trippy'],
    popularity: 6,
    relatedStyles: ['progressive-rock', 'garage-rock'],
    tempo: '90-130 BPM',
    mood: ['psychedelic', 'trippy', 'experimental']
  },
  {
    id: 'post-rock',
    name: 'Post-Rock',
    category: StyleCategory.ROCK,
    description: 'Instrumental rock with atmospheric buildups',
    tags: ['instrumental', 'atmospheric', 'cinematic'],
    popularity: 6,
    relatedStyles: ['shoegaze', 'ambient'],
    tempo: '80-120 BPM',
    mood: ['atmospheric', 'cinematic', 'emotional']
  },
  {
    id: 'garage-rock',
    name: 'Garage Rock',
    category: StyleCategory.ROCK,
    description: 'Raw, energetic rock with lo-fi production',
    tags: ['raw', 'lo-fi', 'energetic'],
    popularity: 5,
    relatedStyles: ['punk', 'indie-rock'],
    tempo: '120-160 BPM',
    mood: ['raw', 'energetic', 'rebellious']
  },
  {
    id: 'shoegaze',
    name: 'Shoegaze',
    category: StyleCategory.ROCK,
    description: 'Ethereal vocals with walls of distorted guitar',
    tags: ['ethereal', 'distorted', 'dreamy'],
    popularity: 5,
    relatedStyles: ['dream-pop', 'post-rock'],
    tempo: '90-120 BPM',
    mood: ['dreamy', 'ethereal', 'atmospheric']
  },
];
