import { MusicStyle, StyleCategory } from './types';

export const classicalStyles: MusicStyle[] = [
  {
    id: 'baroque',
    name: 'Baroque',
    category: StyleCategory.CLASSICAL,
    description: 'Ornate and elaborate classical music from 1600-1750',
    tags: ['ornate', 'elaborate', 'historical'],
    popularity: 7,
    relatedStyles: ['classical', 'romantic'],
    tempo: 'variable',
    mood: ['formal', 'complex', 'structured']
  },
  {
    id: 'classical',
    name: 'Classical',
    category: StyleCategory.CLASSICAL,
    description: 'Classical period music from 1750-1820',
    tags: ['structured', 'formal', 'orchestral'],
    popularity: 8,
    relatedStyles: ['baroque', 'romantic'],
    tempo: 'variable',
    mood: ['formal', 'balanced', 'elegant']
  },
  {
    id: 'romantic',
    name: 'Romantic',
    category: StyleCategory.CLASSICAL,
    description: 'Expressive and emotional classical music from 1820-1910',
    tags: ['expressive', 'emotional', 'orchestral'],
    popularity: 7,
    relatedStyles: ['classical', 'modern'],
    tempo: 'variable',
    mood: ['emotional', 'dramatic', 'passionate']
  },
  {
    id: 'modern',
    name: 'Modern Classical',
    category: StyleCategory.CLASSICAL,
    description: '20th century and contemporary classical music',
    tags: ['contemporary', 'experimental', 'orchestral'],
    popularity: 6,
    relatedStyles: ['romantic', 'avant-garde'],
    tempo: 'variable',
    mood: ['experimental', 'complex', 'varied']
  },
  {
    id: 'avant-garde',
    name: 'Avant-Garde',
    category: StyleCategory.CLASSICAL,
    description: 'Experimental and unconventional classical music',
    tags: ['experimental', 'unconventional', 'modern'],
    popularity: 5,
    relatedStyles: ['modern', 'free-jazz'],
    tempo: 'variable',
    mood: ['experimental', 'challenging', 'abstract']
  },
  {
    id: 'minimalism',
    name: 'Minimalism',
    category: StyleCategory.CLASSICAL,
    description: 'Repetitive and gradual classical music style',
    tags: ['repetitive', 'gradual', 'modern'],
    popularity: 6,
    relatedStyles: ['modern', 'ambient'],
    tempo: 'variable',
    mood: ['hypnotic', 'calm', 'meditative']
  },
];
