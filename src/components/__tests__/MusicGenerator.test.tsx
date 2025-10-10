import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { MusicGenerator } from '../MusicGenerator';
import { TooltipProvider } from '@/components/ui/tooltip';

// --- MOCKS ---

const toastMock = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/stores/useMusicGenerationStore');
vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vi.fn() }),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>{children}</TooltipProvider>
);

// --- TESTS ---

describe('MusicGenerator (Redesigned)', () => {
  const generateMusicFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    generateMusicFn.mockImplementation(async (params, toast, onSuccess) => {
      onSuccess?.();
      return Promise.resolve(true);
    });

    vi.mocked(useMusicGenerationStore).mockReturnValue({
      generateMusic: generateMusicFn,
      isGenerating: false,
    });
  });

  it('renders simple mode by default', () => {
    render(<TestWrapper><MusicGenerator /></TestWrapper>);
    expect(screen.getByLabelText(/Описание трека/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Стилевой промт/i)).not.toBeInTheDocument();
  });

  it('switches to advanced mode and shows advanced fields', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><MusicGenerator /></TestWrapper>);

    const advancedTab = screen.getByRole('tab', { name: 'Продвинутый' });
    await user.click(advancedTab);

    // Use findBy to wait for the element to appear
    expect(await screen.findByLabelText(/Стилевой промт/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/Текст песни/i)).toBeInTheDocument();
  });

  it('validates empty prompt in simple mode', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><MusicGenerator /></TestWrapper>);

    const createButton = screen.getByRole('button', { name: /Создать/i });
    await user.click(createButton);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Опишите трек или добавьте текст' })
    );
    expect(generateMusicFn).not.toHaveBeenCalled();
  });

  it('validates empty fields in advanced mode', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><MusicGenerator /></TestWrapper>);

    await user.click(screen.getByRole('tab', { name: 'Продвинутый' }));
    const createButton = screen.getByRole('button', { name: /Создать/i });
    await user.click(createButton);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Опишите трек или добавьте текст' })
    );
    expect(generateMusicFn).not.toHaveBeenCalled();
  });

  it('calls generate with correct params from simple mode', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><MusicGenerator /></TestWrapper>);

    await user.type(screen.getByLabelText(/Описание трека/i), 'Synthwave masterpiece');
    await user.click(screen.getByRole('button', { name: /Создать/i }));

    await waitFor(() => {
      expect(generateMusicFn).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: 'Synthwave masterpiece',
          customMode: false,
        }),
        expect.any(Function),
        undefined
      );
    });
  });

  it('calls generate with correct params from advanced mode', async () => {
    const user = userEvent.setup();
    render(<TestWrapper><MusicGenerator /></TestWrapper>);

    await user.click(screen.getByRole('tab', { name: 'Продвинутый' }));

    await user.type(await screen.findByLabelText(/Стилевой промт/i), '80s synth pop');
    await user.type(await screen.findByLabelText(/Текст песни/i), 'Electric dreams');
    await user.type(await screen.findByLabelText(/Жанры/i), 'pop, electronic');

    await user.click(screen.getByRole('button', { name: /Создать/i }));

    await waitFor(() => {
      expect(generateMusicFn).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: '80s synth pop',
          lyrics: 'Electric dreams',
          styleTags: ['pop', 'electronic'],
          customMode: true,
        }),
        expect.any(Function),
        undefined
      );
    });
  });
});