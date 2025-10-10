import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TrackListItem } from '@/features/tracks/components/TrackListItem';
import { Toaster } from '@/components/ui/toaster';
import type { Track } from '@/services/api.service';

// --- Mocks ---

// 1. Hoist and create mock functions
const mockPlayTrack = vi.hoisted(() => vi.fn());
const mockUseAudioPlayer = vi.hoisted(() => vi.fn());

// 2. Mock dependencies
vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: mockUseAudioPlayer,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: [],
    toast: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

// --- Test Setup ---

const mockTrack: Track = {
  id: 'track-1',
  title: 'Test Track',
  audio_url: 'https://example.com/audio.mp3',
  cover_url: 'https://example.com/cover.jpg',
  duration: 180,
  status: 'completed',
  created_at: new Date().toISOString(),
  style_tags: ['rock', 'indie'],
  like_count: 5,
};

const renderComponent = (ui: React.ReactElement) => {
  return render(
    <>
      <Toaster />
      {ui}
    </>
  );
};

describe('TrackListItem', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Provide a default implementation for the mocked hook
    mockUseAudioPlayer.mockReturnValue({
      playTrack: mockPlayTrack,
      currentTrack: null,
      isPlaying: false,
      playTrackWithQueue: vi.fn(),
      pauseTrack: vi.fn(),
      currentTime: 0,
      duration: 0,
      volume: 1,
      queue: [],
      currentQueueIndex: -1,
      togglePlayPause: vi.fn(),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
      playNext: vi.fn(),
      playPrevious: vi.fn(),
      addToQueue: vi.fn(),
      removeFromQueue: vi.fn(),
      clearQueue: vi.fn(),
      reorderQueue: vi.fn(),
      switchToVersion: vi.fn(),
      getAvailableVersions: vi.fn(() => []),
      currentVersionIndex: 0,
      audioRef: { current: null },
      clearCurrentTrack: vi.fn(),
      isPlayerVisible: false,
    });
  });

  it('renders track title and style tags', () => {
    renderComponent(<TrackListItem track={mockTrack} />);
    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText(/rock, indie/)).toBeInTheDocument();
  });

  it('renders formatted duration', () => {
    renderComponent(<TrackListItem track={mockTrack} />);
    expect(screen.getByText(/· 3:00/)).toBeInTheDocument();
  });

  it('calls onClick when the item is clicked', async () => {
    const handleClick = vi.fn();
    renderComponent(<TrackListItem track={mockTrack} onClick={handleClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Трек Test Track/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('calls playTrack when play button is clicked', async () => {
    renderComponent(<TrackListItem track={mockTrack} />);
    await userEvent.hover(screen.getByRole('button', { name: /Трек Test Track/i }));
    const playButton = await screen.findByRole('button', { name: /Воспроизвести/i });
    await userEvent.click(playButton);
    expect(mockPlayTrack).toHaveBeenCalledWith(expect.objectContaining({ id: 'track-1' }));
  });

  it('disables download button when status is not completed', async () => {
    const processingTrack = { ...mockTrack, status: 'processing' as const, audio_url: undefined };
    renderComponent(<TrackListItem track={processingTrack} />);

    await userEvent.hover(screen.getByRole('button', { name: /Трек Test Track/i }));
    const downloadButton = await screen.findByRole('button', { name: /скачать/i });
    expect(downloadButton).toBeDisabled();
  });
});