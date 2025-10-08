import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MusicGenerator } from '../MusicGenerator';

type MockGenerateOptions = {
  prompt?: string;
  [key: string]: unknown;
};

const generateMusicMock = vi.fn<(options?: MockGenerateOptions) => Promise<boolean>>();
const improvePromptMock = vi.fn();
const vibrateMock = vi.fn();
const toastMock = vi.fn();

const musicGenerationState = {
  isGenerating: false,
  isImproving: false,
};

vi.mock('@/hooks/useMusicGeneration', () => ({
  useMusicGeneration: () => ({
    generateMusic: generateMusicMock,
    isGenerating: musicGenerationState.isGenerating,
    isImproving: musicGenerationState.isImproving,
    improvePrompt: improvePromptMock,
  }),
}));

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({
    vibrate: vibrateMock,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/hooks/useProviderBalance', () => ({
  useProviderBalance: () => ({
    balance: { balance: 5, currency: 'credits', provider: 'suno' },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('MusicGenerator vocal warning flow', () => {
  beforeEach(() => {
    musicGenerationState.isGenerating = false;
    musicGenerationState.isImproving = false;
    generateMusicMock.mockReset();
    generateMusicMock.mockResolvedValue(true);
    vibrateMock.mockReset();
    toastMock.mockReset();
  });

  it('shows a confirmation dialog and uses stored parameters when confirmed', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);

    const descriptionField = screen.getByPlaceholderText('Hip-hop, R&B, upbeat');
    await user.type(descriptionField, 'First idea');

    const generateButton = screen.getByRole('button', { name: /Create/i });
    await user.click(generateButton);

    const warningText = await screen.findByText('Вокал включён, но текстов нет. Продолжить?');
    expect(warningText).toBeInTheDocument();
    expect(generateMusicMock).not.toHaveBeenCalled();

    fireEvent.change(descriptionField, { target: { value: 'Second idea' } });

    const continueButton = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueButton);

    await waitFor(() => {
      expect(generateMusicMock).toHaveBeenCalledTimes(1);
    });

    const callArgs = generateMusicMock.mock.calls[0]?.[0];
    expect(callArgs?.prompt).toContain('First idea');
  });

  it('cancels generation when dialog is dismissed', async () => {
    const user = userEvent.setup();
    render(<MusicGenerator />);

    const descriptionField = screen.getByPlaceholderText('Hip-hop, R&B, upbeat');
    await user.type(descriptionField, 'Warning case');

    const generateButton = screen.getByRole('button', { name: /Create/i });
    await user.click(generateButton);

    const warningText = await screen.findByText('Вокал включён, но текстов нет. Продолжить?');
    expect(warningText).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('Вокал включён, но текстов нет. Продолжить?')).not.toBeInTheDocument();
    });

    expect(generateMusicMock).not.toHaveBeenCalled();
  });

  it('disables confirmation when generation improvements are active', async () => {
    musicGenerationState.isImproving = true;

    const user = userEvent.setup();
    render(<MusicGenerator />);

    const descriptionField = screen.getByPlaceholderText('Hip-hop, R&B, upbeat');
    await user.type(descriptionField, 'Busy state');

    const generateButton = screen.getByRole('button', { name: /Create/i });
    await user.click(generateButton);

    const continueButton = await screen.findByRole('button', { name: /Continue/i });
    expect(continueButton).toBeDisabled();

    musicGenerationState.isImproving = false;
  });
});
