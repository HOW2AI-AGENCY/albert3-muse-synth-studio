import { describe, bench } from 'vitest';
import { render } from '@testing-library/react';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { LyricsVirtualGrid } from '@/components/lyrics/LyricsVirtualGrid';

const generateMockHistory = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    prompt: `Test prompt ${i} - Lorem ipsum dolor sit amet consectetur adipisicing elit`,
    style_tags: ['rock', 'energetic', 'upbeat'],
    genre: 'rock',
    mood: 'energetic',
    is_template: false,
    usage_count: Math.floor(Math.random() * 50),
    last_used_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
    created_at: new Date(Date.now() - Math.random() * 20000000000).toISOString(),
  }));

const generateMockLyrics = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `lyrics-${i}`,
    title: `Song Title ${i}`,
    content: `Verse 1\nLyrics content ${i}\n\nChorus\nMore lyrics here\n\nVerse 2\nEven more content`,
    folder: i % 3 === 0 ? 'Folder A' : i % 3 === 1 ? 'Folder B' : null,
    is_favorite: i % 5 === 0,
    created_at: new Date().toISOString(),
  }));

describe('Virtualization Performance Benchmarks', () => {
  bench('PromptHistoryDialog - 10 items (baseline)', () => {
    const items = generateMockHistory(10);
    render(
      <PromptHistoryDialog
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
      />
    );
  });

  bench('PromptHistoryDialog - 100 items', () => {
    const items = generateMockHistory(100);
    render(
      <PromptHistoryDialog
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
      />
    );
  });

  bench('PromptHistoryDialog - 1000 items', () => {
    const items = generateMockHistory(1000);
    render(
      <PromptHistoryDialog
        open={true}
        onOpenChange={() => {}}
        onSelect={() => {}}
      />
    );
  });

  bench('LyricsVirtualGrid - 100 items', () => {
    const mockLyrics = generateMockLyrics(100);
    render(
      <LyricsVirtualGrid
        lyrics={mockLyrics}
        columns={3}
        onSelect={() => {}}
        selectedId={null}
      />
    );
  });

  bench('LyricsVirtualGrid - 1000 items', () => {
    const mockLyrics = generateMockLyrics(1000);
    render(
      <LyricsVirtualGrid
        lyrics={mockLyrics}
        columns={3}
        onSelect={() => {}}
        selectedId={null}
      />
    );
  });

  bench('LyricsVirtualGrid - 10000 items (stress test)', () => {
    const mockLyrics = generateMockLyrics(10000);
    render(
      <LyricsVirtualGrid
        lyrics={mockLyrics}
        columns={3}
        onSelect={() => {}}
        selectedId={null}
      />
    );
  });
});
