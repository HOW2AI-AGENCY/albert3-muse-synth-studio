import { ambientStyles } from './ambient';
import { classicalStyles } from './classical';
import { electronicStyles } from './electronic';
import { experimentalStyles } from './experimental';
import { hipHopStyles } from './hip-hop';
import { jazzStyles } from './jazz';
import { rockStyles } from './rock';
import { worldStyles } from './world';
import {
  MusicStyle,
  MusicStyleRegistry,
  StyleCategory
} from './types';

export {
  MusicStyle,
  MusicStyleRegistry,
  StyleCategory
} from './types';

export {
  ambientStyles,
  classicalStyles,
  electronicStyles,
  experimentalStyles,
  hipHopStyles,
  jazzStyles,
  rockStyles,
  worldStyles
};

export const MUSIC_STYLE_REGISTRY: MusicStyleRegistry = {
  [StyleCategory.ELECTRONIC]: electronicStyles,
  [StyleCategory.ROCK]: rockStyles,
  [StyleCategory.HIP_HOP]: hipHopStyles,
  [StyleCategory.JAZZ]: jazzStyles,
  [StyleCategory.CLASSICAL]: classicalStyles,
  [StyleCategory.WORLD]: worldStyles,
  [StyleCategory.AMBIENT]: ambientStyles,
  [StyleCategory.EXPERIMENTAL]: experimentalStyles
};

export const MUSIC_STYLES: MusicStyle[] = Object.values(MUSIC_STYLE_REGISTRY).flat();

export const getStylesByCategory = (category: StyleCategory): MusicStyle[] => {
  return MUSIC_STYLE_REGISTRY[category] ?? [];
};

export const getStyleById = (id: string): MusicStyle | undefined => {
  return MUSIC_STYLES.find(style => style.id === id);
};

export const getRelatedStyles = (styleId: string): MusicStyle[] => {
  const style = getStyleById(styleId);
  if (!style) return [];

  return style.relatedStyles
    .map(relatedId => getStyleById(relatedId))
    .filter((relatedStyle): relatedStyle is MusicStyle => relatedStyle !== undefined);
};

export const searchStyles = (query: string): MusicStyle[] => {
  const lowerQuery = query.toLowerCase();
  return MUSIC_STYLES.filter(style =>
    style.name.toLowerCase().includes(lowerQuery) ||
    style.description.toLowerCase().includes(lowerQuery) ||
    style.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
};

export const getPopularStyles = (limit: number = 10): MusicStyle[] => {
  return [...MUSIC_STYLES]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

export const getCategoryName = (category: StyleCategory): string => {
  const names: Record<StyleCategory, string> = {
    [StyleCategory.ELECTRONIC]: 'Electronic',
    [StyleCategory.ROCK]: 'Rock',
    [StyleCategory.HIP_HOP]: 'Hip-Hop',
    [StyleCategory.JAZZ]: 'Jazz',
    [StyleCategory.CLASSICAL]: 'Classical',
    [StyleCategory.WORLD]: 'World',
    [StyleCategory.AMBIENT]: 'Ambient',
    [StyleCategory.EXPERIMENTAL]: 'Experimental'
  };

  return names[category];
};
