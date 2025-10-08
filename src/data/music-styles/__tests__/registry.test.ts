import { describe, expect, it } from 'vitest';

import {
  MUSIC_STYLE_REGISTRY,
  MUSIC_STYLES,
  getCategoryName,
  getRelatedStyles,
  getStyleById,
  getStylesByCategory,
  searchStyles,
  StyleCategory
} from '..';

describe('music style registry', () => {
  it('exposes all categories in the registry', () => {
    const categories = Object.keys(MUSIC_STYLE_REGISTRY);
    expect(categories).toEqual([
      StyleCategory.ELECTRONIC,
      StyleCategory.ROCK,
      StyleCategory.HIP_HOP,
      StyleCategory.JAZZ,
      StyleCategory.CLASSICAL,
      StyleCategory.WORLD,
      StyleCategory.AMBIENT,
      StyleCategory.EXPERIMENTAL
    ]);
  });

  it('combines all styles into a flattened collection', () => {
    expect(MUSIC_STYLES).toHaveLength(68);
    const uniqueIds = new Set(MUSIC_STYLES.map(style => style.id));
    expect(uniqueIds.size).toBe(MUSIC_STYLES.length);
  });

  it('looks up styles by category', () => {
    const electronic = getStylesByCategory(StyleCategory.ELECTRONIC);
    expect(electronic.every(style => style.category === StyleCategory.ELECTRONIC)).toBe(true);
    expect(electronic.length).toBeGreaterThan(0);
  });

  it('provides lookup helpers', () => {
    const style = getStyleById('house');
    expect(style?.name).toBe('House');
    expect(getCategoryName(StyleCategory.JAZZ)).toBe('Jazz');
    expect(searchStyles('ambient').length).toBeGreaterThan(0);
  });

  it('returns related styles without undefined entries', () => {
    const related = getRelatedStyles('house');
    expect(related.length).toBeGreaterThan(0);
    expect(related.every(item => Boolean(item.id))).toBe(true);
  });
});
