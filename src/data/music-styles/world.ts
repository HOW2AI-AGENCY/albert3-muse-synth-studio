import { MusicStyle, StyleCategory } from './types';

export const worldStyles: MusicStyle[] = [
  {
    id: 'latin',
    name: 'Latin',
    category: StyleCategory.WORLD,
    description: 'Rhythmic and danceable music from Latin America',
    tags: ['rhythmic', 'dance', 'latin'],
    popularity: 8,
    relatedStyles: ['salsa', 'bossa-nova'],
    tempo: '90-130 BPM',
    mood: ['energetic', 'festive', 'passionate']
  },
  {
    id: 'african',
    name: 'African',
    category: StyleCategory.WORLD,
    description: 'Traditional and modern music from Africa',
    tags: ['traditional', 'rhythmic', 'percussion'],
    popularity: 7,
    relatedStyles: ['highlife', 'afrobeat'],
    tempo: 'variable',
    mood: ['rhythmic', 'energetic', 'spiritual']
  },
  {
    id: 'asian',
    name: 'Asian',
    category: StyleCategory.WORLD,
    description: 'Traditional and contemporary music from Asia',
    tags: ['traditional', 'melodic', 'cultural'],
    popularity: 6,
    relatedStyles: ['k-pop', 'j-pop'],
    tempo: 'variable',
    mood: ['melodic', 'cultural', 'varied']
  },
  {
    id: 'reggae',
    name: 'Reggae',
    category: StyleCategory.WORLD,
    description: 'Jamaican music with offbeat rhythms and social lyrics',
    tags: ['offbeat', 'social', 'laid-back'],
    popularity: 7,
    relatedStyles: ['ska', 'dub'],
    tempo: '70-90 BPM',
    mood: ['laid-back', 'positive', 'groovy']
  },
  {
    id: 'flamenco',
    name: 'Flamenco',
    category: StyleCategory.WORLD,
    description: 'Spanish folk music with guitar and passionate vocals',
    tags: ['spanish', 'guitar', 'passionate'],
    popularity: 6,
    relatedStyles: ['latin', 'folk'],
    tempo: 'variable',
    mood: ['passionate', 'emotional', 'intense']
  },
  {
    id: 'celtic',
    name: 'Celtic',
    category: StyleCategory.WORLD,
    description: 'Traditional music from Celtic regions',
    tags: ['traditional', 'folk', 'melodic'],
    popularity: 5,
    relatedStyles: ['folk', 'world'],
    tempo: 'variable',
    mood: ['melodic', 'traditional', 'uplifting']
  },
];
