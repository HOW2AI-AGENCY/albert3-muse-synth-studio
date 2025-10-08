import { MusicStyle, StyleCategory } from './types';

export const experimentalStyles: MusicStyle[] = [
  {
    id: 'idm',
    name: 'IDM',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Intelligent Dance Music with complex rhythms',
    tags: ['complex', 'rhythmic', 'electronic'],
    popularity: 5,
    relatedStyles: ['glitch', 'ambient'],
    tempo: 'variable',
    mood: ['complex', 'experimental', 'abstract']
  },
  {
    id: 'glitch',
    name: 'Glitch',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Music using digital artifacts and glitches',
    tags: ['digital', 'artifacts', 'experimental'],
    popularity: 4,
    relatedStyles: ['idm', 'noise'],
    tempo: 'variable',
    mood: ['experimental', 'chaotic', 'abstract']
  },
  {
    id: 'noise',
    name: 'Noise',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Music using noise and atonal sounds',
    tags: ['noise', 'atonal', 'experimental'],
    popularity: 3,
    relatedStyles: ['glitch', 'industrial'],
    tempo: 'variable',
    mood: ['chaotic', 'intense', 'abrasive']
  },
  {
    id: 'avant-garde-electronic',
    name: 'Avant-Garde Electronic',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Experimental electronic music pushing boundaries',
    tags: ['experimental', 'electronic', 'avant-garde'],
    popularity: 4,
    relatedStyles: ['idm', 'glitch'],
    tempo: 'variable',
    mood: ['experimental', 'abstract', 'innovative']
  },
  {
    id: 'free-improvisation',
    name: 'Free Improvisation',
    category: StyleCategory.EXPERIMENTAL,
    description: 'Improvised music without predefined structure',
    tags: ['improvised', 'free', 'experimental'],
    popularity: 3,
    relatedStyles: ['free-jazz', 'avant-garde'],
    tempo: 'variable',
    mood: ['spontaneous', 'experimental', 'abstract']
  }
];

