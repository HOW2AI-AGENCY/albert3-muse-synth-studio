import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MusicGenerator } from '../MusicGenerator';

const toastMock = vi.hoisted(() => vi.fn());

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

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/useProviderBalance', () => ({
  useProviderBalance: () => ({
    balance: { balance: 7, currency: 'credits', provider: 'suno' },
    isLoading: false,
    error: null,
  }),
}));

describe('MusicGenerator advanced interactions', () => {
  beforeEach(() => {
    toastMock.mockReset();
    musicGenerationMocks.generateMusic.mockReset();
    musicGenerationMocks.generateMusic.mockResolvedValue(true);
    musicGenerationMocks.hook.mockReturnValue({
      generateMusic: musicGenerationMocks.generateMusic,
      improvePrompt: musicGenerationMocks.improvePrompt,
      isGenerating: false,
      isImproving: false,
    });
  });

  it('switches to custom mode when adding lyrics from simple mode', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);

    const addLyricsButton = screen.getByRole('button', { name: 'Добавить лирику' });
    await user.click(addLyricsButton);

    expect(screen.getByPlaceholderText('Напишите или вставьте текст песни')).toBeInTheDocument();
  });

  it('validates custom mode when no content is provided', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);

    const customTab = screen.getByRole('tab', { name: 'Custom' });
    await user.click(customTab);

    const createButton = screen.getByRole('button', { name: 'Создать трек' });
    await user.click(createButton);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Заполните стиль или добавьте лирику' }),
    );
  });

  it('shows audio influence controls after uploading an audio reference', async () => {
    const user = userEvent.setup();
    const { container } = render(<MusicGenerator />);

    const customTab = screen.getByRole('tab', { name: 'Custom' });
    await user.click(customTab);

    const advancedToggle = screen.getByText('Продвинутые настройки');
    await user.click(advancedToggle);

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'reference.mp3', { type: 'audio/mpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByText('reference.mp3')).toBeInTheDocument();
    expect(screen.getByText('Audio influence')).toBeInTheDocument();
  });
});
