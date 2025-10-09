import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MusicGenerator } from '../MusicGenerator';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const musicGenerationMocks = vi.hoisted(() => ({
  hook: vi.fn(),
  generateMusic: vi.fn(),
  improvePrompt: vi.fn(),
}));
vi.mock('@/hooks/useMusicGeneration', () => ({
  useMusicGeneration: (...args: unknown[]) => musicGenerationMocks.hook(...args),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();
    musicGenerationMocks.generateMusic.mockResolvedValue(true);
    musicGenerationMocks.improvePrompt.mockResolvedValue('Better prompt');
    musicGenerationMocks.hook.mockReturnValue({
      generateMusic: musicGenerationMocks.generateMusic,
      improvePrompt: musicGenerationMocks.improvePrompt,
      isGenerating: false,
      isImproving: false,
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

    await waitFor(() => expect(musicGenerationMocks.generateMusic).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(onTrackGenerated).toHaveBeenCalled());
    await waitFor(() => expect(textarea).toHaveValue(''));

    expect(musicGenerationMocks.generateMusic).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Test melody'),
        hasVocals: true,
      }),
    );
  });

  it('enhances prompt using AI helper', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);

    const textarea = screen.getByPlaceholderText('Опишите желаемую музыку, настроение и ключевые инструменты');
    await user.type(textarea, 'Initial idea');

    const enhanceButton = screen.getAllByRole('button', { name: 'Улучшить' })[0];
    await user.click(enhanceButton);

    expect(musicGenerationMocks.improvePrompt).toHaveBeenCalledWith('Initial idea');
    expect(await screen.findByDisplayValue('Better prompt')).toBeInTheDocument();
  });
});
