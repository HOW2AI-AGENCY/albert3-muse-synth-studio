export enum StyleCategory {
  ELECTRONIC = 'electronic',
  ROCK = 'rock',
  HIP_HOP = 'hip-hop',
  JAZZ = 'jazz',
  CLASSICAL = 'classical',
  WORLD = 'world',
  AMBIENT = 'ambient',
  EXPERIMENTAL = 'experimental'
}

export interface MusicStyle {
  id: string;
  name: string;
  category: StyleCategory;
  description: string;
  tags: string[];
  popularity: number; // 1-10 scale
  relatedStyles: string[];
  tempo?: string; // BPM range
  mood?: string[];
}

export type MusicStyleRegistry = Record<StyleCategory, MusicStyle[]>;
