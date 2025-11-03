/**
 * Unit Tests: Lyrics Parser
 * TEST-005: Core Utilities Unit Tests (4h)
 */
import { describe, it, expect } from 'vitest';
import {
  extractTags,
  parseTag,
  parseLyrics,
  exportToSunoFormat,
  lintDocument,
  deduplicateTags,
} from '@/utils/lyricsParser';
import type { SongDocument, Tag } from '@/types/lyrics';

describe('lyricsParser', () => {
  describe('extractTags', () => {
    it('should extract tags from text', () => {
      const text = '[Verse] This is a verse [Fast Tempo] [Emotional]';
      const tags = extractTags(text);
      
      expect(tags).toHaveLength(3);
      expect(tags[0].value).toBe('Verse');
      expect(tags[1].value).toBe('Fast Tempo');
      expect(tags[2].value).toBe('Emotional');
    });

    it('should return empty array for text without tags', () => {
      const text = 'Just plain text';
      const tags = extractTags(text);
      
      expect(tags).toHaveLength(0);
    });

    it('should handle malformed tags', () => {
      const text = '[Incomplete tag';
      const tags = extractTags(text);
      
      expect(tags).toHaveLength(0);
    });
  });

  describe('parseTag', () => {
    it('should parse section tag correctly', () => {
      const tag = parseTag('Chorus', '[Chorus]');
      
      expect(tag).toBeTruthy();
      expect(tag?.category).toBe('section');
      expect(tag?.value).toBe('Chorus');
    });

    it('should parse tempo tag', () => {
      const tag = parseTag('Tempo: 120 BPM', '[Tempo: 120 BPM]');
      
      expect(tag).toBeTruthy();
      expect(tag?.category).toBe('tempo');
    });

    it('should parse key tag', () => {
      const tag = parseTag('Key: C Major', '[Key: C Major]');
      
      expect(tag).toBeTruthy();
      expect(tag?.category).toBe('key');
    });

    it('should fallback to meta for unknown tags', () => {
      const tag = parseTag('Unknown Tag', '[Unknown Tag]');
      
      expect(tag).toBeTruthy();
      expect(tag?.category).toBe('meta');
      expect(tag?.description).toBe('Custom tag');
    });
  });

  describe('parseLyrics', () => {
    it('should parse simple lyrics into sections', () => {
      const text = `[Verse]
This is verse one
Second line of verse

[Chorus]
This is the chorus`;

      const sections = parseLyrics(text);
      
      expect(sections).toHaveLength(2);
      expect(sections[0].title).toBe('Verse');
      expect(sections[0].lines).toEqual(['This is verse one', 'Second line of verse']);
      expect(sections[1].title).toBe('Chorus');
      expect(sections[1].lines).toEqual(['This is the chorus']);
    });

    it('should handle lyrics without section tags', () => {
      const text = 'Line one\nLine two';
      const sections = parseLyrics(text);
      
      expect(sections).toHaveLength(1);
      expect(sections[0].title).toBe('Untitled');
      expect(sections[0].lines).toEqual(['Line one', 'Line two']);
    });

    it('should extract tags from sections', () => {
      const text = `[Verse] [Emotional] [Slow]
First line`;

      const sections = parseLyrics(text);
      
      expect(sections[0].tags.length).toBeGreaterThan(0);
    });

    it('should assign incrementing order to sections', () => {
      const text = `[Verse 1]
Line 1

[Chorus]
Line 2

[Verse 2]
Line 3`;

      const sections = parseLyrics(text);
      
      expect(sections).toHaveLength(3);
      expect(sections[0].order).toBe(0);
      expect(sections[1].order).toBe(1);
      expect(sections[2].order).toBe(2);
    });
  });

  describe('exportToSunoFormat', () => {
    it('should export document to Suno format', () => {
      const document: SongDocument = {
        id: 'test',
        title: 'Test Song',
        globalTags: [],
        sections: [
          {
            id: 's1',
            title: 'Verse',
            tags: [],
            lines: ['Line 1', 'Line 2'],
            order: 0,
          },
          {
            id: 's2',
            title: 'Chorus',
            tags: [],
            lines: ['Chorus line'],
            order: 1,
          },
        ],
      };

      const exported = exportToSunoFormat(document);
      
      expect(exported).toContain('[Verse]');
      expect(exported).toContain('Line 1');
      expect(exported).toContain('[Chorus]');
    });

    it('should include global tags at the top', () => {
      const document: SongDocument = {
        id: 'test',
        title: 'Test',
        globalTags: [
          { id: '1', category: 'tempo', value: 'Fast', raw: '[Fast]', icon: 'gauge', color: '', description: '' },
        ],
        sections: [
          { id: 's1', title: 'Verse', tags: [], lines: ['Test'], order: 0 },
        ],
      };

      const exported = exportToSunoFormat(document);
      
      expect(exported).toMatch(/^\[Fast\]/);
    });
  });

  describe('lintDocument', () => {
    it('should warn about too many instruments', () => {
      const instrumentTags: Tag[] = Array.from({ length: 6 }, (_, i) => ({
        id: `i${i}`,
        category: 'instrument',
        value: `Instrument ${i}`,
        raw: `[Instrument ${i}]`,
        icon: 'music',
        color: '',
        description: '',
      }));

      const document: SongDocument = {
        id: 'test',
        title: 'Test',
        globalTags: [],
        sections: [
          { id: 's1', title: 'Verse', tags: instrumentTags, lines: ['Test'], order: 0 },
        ],
      };

      const issues = lintDocument(document);
      
      expect(issues.some(i => i.message.includes('Too many instruments'))).toBe(true);
    });

    it('should warn about multiple emotions in one section', () => {
      const emotionTags: Tag[] = [
        { id: 'e1', category: 'emotion', value: 'Happy', raw: '[Happy]', icon: 'smile', color: '', description: '' },
        { id: 'e2', category: 'emotion', value: 'Sad', raw: '[Sad]', icon: 'frown', color: '', description: '' },
        { id: 'e3', category: 'emotion', value: 'Angry', raw: '[Angry]', icon: 'angry', color: '', description: '' },
      ];

      const document: SongDocument = {
        id: 'test',
        title: 'Test',
        globalTags: [],
        sections: [
          { id: 's1', title: 'Verse', tags: emotionTags, lines: ['Test'], order: 0 },
        ],
      };

      const issues = lintDocument(document);
      
      expect(issues.some(i => i.message.includes('emotions'))).toBe(true);
    });

    it('should error on empty sections', () => {
      const document: SongDocument = {
        id: 'test',
        title: 'Test',
        globalTags: [],
        sections: [
          { id: 's1', title: 'Empty', tags: [], lines: [], order: 0 },
        ],
      };

      const issues = lintDocument(document);
      
      expect(issues.some(i => i.severity === 'error' && i.message.includes('empty'))).toBe(true);
    });

    it('should suggest adding chorus', () => {
      const document: SongDocument = {
        id: 'test',
        title: 'Test',
        globalTags: [],
        sections: [
          { id: 's1', title: 'Verse 1', tags: [], lines: ['Line'], order: 0 },
          { id: 's2', title: 'Verse 2', tags: [], lines: ['Line'], order: 1 },
          { id: 's3', title: 'Bridge', tags: [], lines: ['Line'], order: 2 },
        ],
      };

      const issues = lintDocument(document);
      
      expect(issues.some(i => i.message.includes('Chorus'))).toBe(true);
    });
  });

  describe('deduplicateTags', () => {
    it('should remove duplicate tags', () => {
      const tags: Tag[] = [
        { id: '1', category: 'section', value: 'Verse', raw: '[Verse]', icon: '', color: '', description: '' },
        { id: '2', category: 'section', value: 'Verse', raw: '[Verse]', icon: '', color: '', description: '' },
        { id: '3', category: 'section', value: 'Chorus', raw: '[Chorus]', icon: '', color: '', description: '' },
      ];

      const unique = deduplicateTags(tags);
      
      expect(unique).toHaveLength(2);
      expect(unique[0].value).toBe('Verse');
      expect(unique[1].value).toBe('Chorus');
    });

    it('should preserve order', () => {
      const tags: Tag[] = [
        { id: '1', category: 'section', value: 'A', raw: '[A]', icon: '', color: '', description: '' },
        { id: '2', category: 'section', value: 'B', raw: '[B]', icon: '', color: '', description: '' },
        { id: '3', category: 'section', value: 'A', raw: '[A]', icon: '', color: '', description: '' },
      ];

      const unique = deduplicateTags(tags);
      
      expect(unique).toHaveLength(2);
      expect(unique[0].value).toBe('A');
      expect(unique[1].value).toBe('B');
    });
  });
});
