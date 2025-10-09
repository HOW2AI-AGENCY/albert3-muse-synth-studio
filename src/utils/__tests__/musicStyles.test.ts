import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  STYLE_HISTORY_KEY,
  addToStyleHistory,
  allStyles,
  getRelatedStyles,
  getStyleById,
  getStyleHistory,
  searchStyles,
  stylePresets,
  styleCategories,
} from '../musicStyles';

describe('musicStyles helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('provides access to categories and presets', () => {
    expect(styleCategories.length).toBeGreaterThan(0);
    expect(stylePresets.some(preset => preset.styleIds.length > 0)).toBe(true);
  });

  it('finds styles by id and returns undefined otherwise', () => {
    const firstStyle = allStyles[0];
    expect(getStyleById(firstStyle.id)).toEqual(firstStyle);
    expect(getStyleById('unknown-style')).toBeUndefined();
  });

  it('returns related styles respecting the limit', () => {
    const styleWithRelations = allStyles.find(style => style.relatedStyles.length >= 2);
    expect(styleWithRelations).toBeDefined();
    const related = getRelatedStyles(styleWithRelations!.id, 2);
    expect(related.length).toBeLessThanOrEqual(2);
    expect(related.every(style => styleWithRelations!.relatedStyles.includes(style.id))).toBe(true);
  });

  it('searches styles by name and description', () => {
    const [first, second] = allStyles;
    const resultsByName = searchStyles(first.name.slice(0, 3));
    const resultsByDescription = searchStyles(second.description.split(' ')[0]);

    expect(resultsByName).toEqual(expect.arrayContaining([first]));
    expect(resultsByDescription).toEqual(expect.arrayContaining([second]));
  });

  it('reads and writes style history in localStorage', () => {
    expect(getStyleHistory()).toEqual([]);

    addToStyleHistory('style-1');
    addToStyleHistory('style-2');
    addToStyleHistory('style-1');

    const stored = JSON.parse(localStorage.getItem(STYLE_HISTORY_KEY) ?? '[]');
    expect(stored[0]).toBe('style-1');
    expect(stored).toHaveLength(2);
    expect(getStyleHistory()).toEqual(stored);
  });

  it('handles malformed history data gracefully', () => {
    localStorage.setItem(STYLE_HISTORY_KEY, 'not-json');
    expect(getStyleHistory()).toEqual([]);
  });
});
