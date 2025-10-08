import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MusicGenerator } from '../MusicGenerator';

vi.mock('@/hooks/useMusicGeneration', () => ({
  useMusicGeneration: () => ({
    prompt: 'Test prompt',
    setPrompt: vi.fn(),
    isGenerating: false,
    isImproving: false,
    provider: 'suno',
    setProvider: vi.fn(),
    hasVocals: false,
    setHasVocals: vi.fn(),
    lyrics: '',
    setLyrics: vi.fn(),
    styleTags: [],
    setStyleTags: vi.fn(),
    generateMusic: vi.fn(),
    improvePrompt: vi.fn(),
  }),
}));

vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({ currentTrack: null, isPlaying: false }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/LyricsEditor', () => ({
  LyricsEditor: () => <div data-testid="lyrics-editor">Lyrics editor</div>,
}));

describe('MusicGenerator smoke test', () => {
  it('renders core UI elements', () => {
    render(<MusicGenerator />);

    expect(screen.getByText(/создайте свою музыку с ai/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/опишите желаемую музыку/i)).toBeInTheDocument();
    expect(screen.getByTestId('lyrics-editor')).toBeInTheDocument();
  });
});
