import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MusicGenerator } from '../MusicGenerator';

// Mock hooks
vi.mock('@/hooks/useMusicGeneration', () => ({
  useMusicGeneration: () => ({
    prompt: '',
    setPrompt: vi.fn(),
    isGenerating: false,
    isImproving: false,
    provider: 'replicate',
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
  useAudioPlayer: () => ({
    currentTrack: null,
    isPlaying: false,
  }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    vibrate: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('MusicGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the component with heading', () => {
      render(<MusicGenerator />);
      
      expect(screen.getByText(/создайте свою музыку с ai/i)).toBeInTheDocument();
    });

    it('renders simple and advanced mode tabs', () => {
      render(<MusicGenerator />);
      
      expect(screen.getByRole('tab', { name: /простой режим/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /расширенный/i })).toBeInTheDocument();
    });

    it('renders prompt textarea', () => {
      render(<MusicGenerator />);
      
      const textarea = screen.getByPlaceholderText(/опишите желаемую музыку/i);
      expect(textarea).toBeInTheDocument();
    });

    it('renders popular genre buttons', () => {
      render(<MusicGenerator />);
      
      expect(screen.getByRole('button', { name: /поп/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /рок/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /электроника/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('allows typing in prompt textarea', () => {
      const setPromptMock = vi.fn();
      vi.mocked(require('@/hooks/useMusicGeneration').useMusicGeneration).mockReturnValue({
        prompt: '',
        setPrompt: setPromptMock,
        isGenerating: false,
        isImproving: false,
        provider: 'replicate',
        setProvider: vi.fn(),
        hasVocals: false,
        setHasVocals: vi.fn(),
        lyrics: '',
        setLyrics: vi.fn(),
        styleTags: [],
        setStyleTags: vi.fn(),
        generateMusic: vi.fn(),
        improvePrompt: vi.fn(),
      });

      render(<MusicGenerator />);
      
      const textarea = screen.getByPlaceholderText(/опишите желаемую музыку/i);
      fireEvent.change(textarea, { target: { value: 'Энергичный электронный трек' } });
      
      expect(setPromptMock).toHaveBeenCalledWith('Энергичный электронный трек');
    });

    it('switches between simple and advanced modes', () => {
      render(<MusicGenerator />);
      
      const advancedTab = screen.getByRole('tab', { name: /расширенный/i });
      fireEvent.click(advancedTab);
      
      // Advanced mode should now be active
      expect(advancedTab).toHaveAttribute('data-state', 'active');
    });

    it('toggles genre tag selection', () => {
      const setStyleTagsMock = vi.fn();
      vi.mocked(require('@/hooks/useMusicGeneration').useMusicGeneration).mockReturnValue({
        prompt: '',
        setPrompt: vi.fn(),
        isGenerating: false,
        isImproving: false,
        provider: 'replicate',
        setProvider: vi.fn(),
        hasVocals: false,
        setHasVocals: vi.fn(),
        lyrics: '',
        setLyrics: vi.fn(),
        styleTags: [],
        setStyleTags: setStyleTagsMock,
        generateMusic: vi.fn(),
        improvePrompt: vi.fn(),
      });

      render(<MusicGenerator />);
      
      const rockButton = screen.getByRole('button', { name: /рок/i });
      fireEvent.click(rockButton);
      
      expect(setStyleTagsMock).toHaveBeenCalled();
    });
  });

  describe('Generation Actions', () => {
    it('calls generateMusic when generate button is clicked', async () => {
      const generateMusicMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(require('@/hooks/useMusicGeneration').useMusicGeneration).mockReturnValue({
        prompt: 'Test prompt',
        setPrompt: vi.fn(),
        isGenerating: false,
        isImproving: false,
        provider: 'replicate',
        setProvider: vi.fn(),
        hasVocals: false,
        setHasVocals: vi.fn(),
        lyrics: '',
        setLyrics: vi.fn(),
        styleTags: [],
        setStyleTags: vi.fn(),
        generateMusic: generateMusicMock,
        improvePrompt: vi.fn(),
      });

      render(<MusicGenerator />);
      
      const generateButton = screen.getByRole('button', { name: /создать музыку/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(generateMusicMock).toHaveBeenCalled();
      });
    });

    it('disables inputs during generation', () => {
      vi.mocked(require('@/hooks/useMusicGeneration').useMusicGeneration).mockReturnValue({
        prompt: 'Test',
        setPrompt: vi.fn(),
        isGenerating: true,
        isImproving: false,
        provider: 'replicate',
        setProvider: vi.fn(),
        hasVocals: false,
        setHasVocals: vi.fn(),
        lyrics: '',
        setLyrics: vi.fn(),
        styleTags: [],
        setStyleTags: vi.fn(),
        generateMusic: vi.fn(),
        improvePrompt: vi.fn(),
      });

      render(<MusicGenerator />);
      
      const textarea = screen.getByPlaceholderText(/опишите желаемую музыку/i);
      expect(textarea).toBeDisabled();
    });

    it('calls improvePrompt when improve button is clicked', async () => {
      const improvePromptMock = vi.fn().mockResolvedValue(undefined);
      vi.mocked(require('@/hooks/useMusicGeneration').useMusicGeneration).mockReturnValue({
        prompt: 'Test prompt',
        setPrompt: vi.fn(),
        isGenerating: false,
        isImproving: false,
        provider: 'replicate',
        setProvider: vi.fn(),
        hasVocals: false,
        setHasVocals: vi.fn(),
        lyrics: '',
        setLyrics: vi.fn(),
        styleTags: [],
        setStyleTags: vi.fn(),
        generateMusic: vi.fn(),
        improvePrompt: improvePromptMock,
      });

      render(<MusicGenerator />);
      
      const improveButton = screen.getByRole('button', { name: /улучшить описание/i });
      fireEvent.click(improveButton);
      
      await waitFor(() => {
        expect(improvePromptMock).toHaveBeenCalled();
      });
    });
  });

  describe('Callback Handling', () => {
    it('calls onTrackGenerated callback after successful generation', async () => {
      const onTrackGeneratedMock = vi.fn();
      const generateMusicMock = vi.fn().mockResolvedValue(undefined);
      
      vi.mocked(require('@/hooks/useMusicGeneration').useMusicGeneration).mockReturnValue({
        prompt: 'Test',
        setPrompt: vi.fn(),
        isGenerating: false,
        isImproving: false,
        provider: 'replicate',
        setProvider: vi.fn(),
        hasVocals: false,
        setHasVocals: vi.fn(),
        lyrics: '',
        setLyrics: vi.fn(),
        styleTags: [],
        setStyleTags: vi.fn(),
        generateMusic: generateMusicMock,
        improvePrompt: vi.fn(),
      });

      render(<MusicGenerator onTrackGenerated={onTrackGeneratedMock} />);
      
      const generateButton = screen.getByRole('button', { name: /создать музыку/i });
      fireEvent.click(generateButton);
      
      await waitFor(() => {
        expect(onTrackGeneratedMock).toHaveBeenCalled();
      });
    });
  });
});
