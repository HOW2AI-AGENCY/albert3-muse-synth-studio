import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { MusicGenerator } from '../MusicGenerator';

// Mock the toast hook
const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

// Mock the Zustand store
vi.mock('@/stores/useMusicGenerationStore');

// Mock other hooks
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vi.fn() }),
}));

vi.mock('@/hooks/useProviderBalance', () => ({
  useProviderBalance: () => ({
    balance: { balance: 12, currency: 'credits', provider: 'suno' },
    isLoading: false,
    error: null,
  }),
}));

describe('MusicGenerator component', () => {
  const generateMusicFn = vi.fn();
  const improvePromptFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();

    // Mock the implementation of generateMusic to simulate success callback
    generateMusicFn.mockImplementation(async (options, toast, onSuccess) => {
      onSuccess?.();
      return Promise.resolve(true);
    });
    improvePromptFn.mockResolvedValue('Better prompt');

    // Setup the mock return value for the store hook
    vi.mocked(useMusicGenerationStore).mockReturnValue({
      generateMusic: generateMusicFn,
      improvePrompt: improvePromptFn,
      isGenerating: false,
      isImproving: false,
      subscription: null,
      cleanupSubscription: vi.fn(),
    });
  });

  it('validates empty form before generation', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);
    const createButton = screen.getByRole('button', { name: 'Создать трек' });
    await user.click(createButton);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Введите описание трека',
      }),
    );
  });

  it('starts generation with filled prompt and resets the form', async () => {
    const user = userEvent.setup();
    const onTrackGenerated = vi.fn();
    render(<MusicGenerator onTrackGenerated={onTrackGenerated} />);

    const textarea = screen.getByPlaceholderText('Опишите желаемую музыку, настроение и ключевые инструменты');
    await user.type(textarea, 'Test melody');
    const createButton = screen.getByRole('button', { name: 'Создать трек' });
    await user.click(createButton);

    await waitFor(() => {
      expect(generateMusicFn).toHaveBeenCalledTimes(1);
      expect(onTrackGenerated).toHaveBeenCalled();
      expect(textarea).toHaveValue('');
    });
  });

  it('enhances prompt using AI helper', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);
    const textarea = screen.getByPlaceholderText('Опишите желаемую музыку, настроение и ключевые инструменты');
    await user.type(textarea, 'Initial idea');
    const enhanceButton = screen.getAllByRole('button', { name: 'Улучшить' })[0];
    await user.click(enhanceButton);
    await waitFor(() => expect(improvePromptFn).toHaveBeenCalledWith('Initial idea', toastMock));
    expect(await screen.findByDisplayValue('Better prompt')).toBeInTheDocument();
  });
});