import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackVariantSelector } from '../../../src/features/tracks/components/TrackVariantSelector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hooks
vi.mock('@/features/tracks/hooks', async () => {
  const actual = await vi.importActual<any>('@/features/tracks/hooks');
  return {
    ...actual,
    useTrackVariants: vi.fn(),
    useSetPreferredVariant: vi.fn(),
  };
});

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const queryClient = new QueryClient();

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('TrackVariantSelector', () => {
  const mockUseTrackVariants = vi.mocked(require('@/features/tracks/hooks').useTrackVariants);
  const mockUseSetPreferredVariant = vi.mocked(require('@/features/tracks/hooks').useSetPreferredVariant);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly and expands on click', () => {
    mockUseTrackVariants.mockReturnValue({
      data: {
        mainTrack: { id: 'track-123-main', title: 'Main' },
        variants: [{ id: 'track-123-v1', isPreferredVariant: true }],
        preferredVariant: { id: 'track-123-v1', isPreferredVariant: true },
      },
      isLoading: false,
    });
    mockUseSetPreferredVariant.mockReturnValue({ mutate: vi.fn() });

    render(
      <Wrapper>
        <TrackVariantSelector trackId="track-123" currentVersionIndex={1} onVersionChange={vi.fn()} />
      </Wrapper>
    );

    const activeBadge = screen.getByLabelText(/Активная версия: V2/);
    expect(activeBadge).toBeTruthy();

    fireEvent.click(activeBadge);
    expect(screen.getByRole('button', { name: /1/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /2/ })).toBeTruthy();
  });

  it('calls onVersionChange with the correct index', () => {
    const onVersionChange = vi.fn();
    mockUseTrackVariants.mockReturnValue({
      data: {
        mainTrack: { id: 'track-123-main' },
        variants: [{ id: 'track-123-v1', isPreferredVariant: true }],
        preferredVariant: { id: 'track-123-v1', isPreferredVariant: true },
      },
      isLoading: false,
    });
    mockUseSetPreferredVariant.mockReturnValue({ mutate: vi.fn() });

    render(
      <Wrapper>
        <TrackVariantSelector trackId="track-123" currentVersionIndex={0} onVersionChange={onVersionChange} />
      </Wrapper>
    );

    const activeBadge = screen.getByLabelText(/Активная версия: V1/);
    fireEvent.click(activeBadge);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(onVersionChange).toHaveBeenCalledWith(1);
  });

  it('disables set master button for the main track', () => {
    mockUseTrackVariants.mockReturnValue({
      data: {
        mainTrack: { id: 'track-123-main' },
        variants: [{ id: 'track-123-v1' }],
        preferredVariant: null,
      },
      isLoading: false,
    });
    mockUseSetPreferredVariant.mockReturnValue({ mutate: vi.fn() });

    render(
      <Wrapper>
        <TrackVariantSelector trackId="track-123" currentVersionIndex={0} onVersionChange={vi.fn()} />
      </Wrapper>
    );

    const starBtn = screen.getByRole('button', { name: 'Основная версия' });
    expect(starBtn).toBeDisabled();
  });

  it('calls setPreferred when setting a variant as master', () => {
    const setPreferred = vi.fn();
    mockUseTrackVariants.mockReturnValue({
      data: {
        mainTrack: { id: 'track-123-main' },
        variants: [{ id: 'track-123-v1', isPreferredVariant: false }],
        preferredVariant: null,
      },
      isLoading: false,
    });
    mockUseSetPreferredVariant.mockReturnValue({ mutate: setPreferred });

    render(
      <Wrapper>
        <TrackVariantSelector trackId="track-123" currentVersionIndex={1} onVersionChange={vi.fn()} />
      </Wrapper>
    );

    const starBtn = screen.getByRole('button', { name: 'Установить как мастер' });
    fireEvent.click(starBtn);
    expect(setPreferred).toHaveBeenCalledWith({ trackId: 'track-123', variantId: 'track-123-v1' }, expect.any(Object));
  });
});
