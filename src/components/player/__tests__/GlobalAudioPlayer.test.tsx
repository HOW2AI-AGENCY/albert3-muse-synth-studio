import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalAudioPlayer } from '../GlobalAudioPlayer';
import { useAudioPlayer, useAudioPlayerSafe } from '@/contexts/AudioPlayerContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { AudioPlayerTrack } from '@/types/track';
import { createRef } from 'react';

// Mock the hooks
vi.mock('@/contexts/AudioPlayerContext');
vi.mock('@/hooks/use-mobile');
vi.mock('@/hooks/useMediaSession', () => ({
  useMediaSession: vi.fn(),
}));

const mockUseAudioPlayer = vi.mocked(useAudioPlayer);
const mockUseAudioPlayerSafe = vi.mocked(useAudioPlayerSafe);
const mockUseIsMobile = vi.mocked(useIsMobile);

const defaultMockData = {
  currentTrack: {
    id: '1',
    title: 'Test Track',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    style_tags: ['rock', 'indie'],
  } as AudioPlayerTrack,
  isPlaying: true,
  currentTime: 30,
  duration: 180,
  volume: 0.7,
  queue: [],
  togglePlayPause: vi.fn(),
  pauseTrack: vi.fn(),
  seekTo: vi.fn(),
  setVolume: vi.fn(),
  playNext: vi.fn(),
  playPrevious: vi.fn(),
  switchToVersion: vi.fn(),
  getAvailableVersions: vi.fn(() => [
    { id: '1', versionNumber: 1, isMasterVersion: true, title: 'Version 1', audio_url: 'url1' },
    { id: '2', versionNumber: 2, isMasterVersion: false, title: 'Version 2', audio_url: 'url2' },
  ]),
  currentVersionIndex: 0,
  clearCurrentTrack: vi.fn(),
  removeFromQueue: vi.fn(),
  playTrack: vi.fn(),
  playTrackWithQueue: vi.fn(),
  addToQueue: vi.fn(),
  clearQueue: vi.fn(),
  reorderQueue: vi.fn(),
  audioRef: createRef<HTMLAudioElement>(),
  currentQueueIndex: 0,
  isPlayerVisible: true,
};

describe('GlobalAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock for both hooks
    mockUseAudioPlayer.mockReturnValue({ ...defaultMockData });
    mockUseAudioPlayerSafe.mockReturnValue({ ...defaultMockData });
    mockUseIsMobile.mockReturnValue(false);
  });

  describe('Rendering', () => {
    it('renders when track is playing', () => {
      render(<GlobalAudioPlayer />);
      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });

    it('renders track cover image', () => {
      render(<GlobalAudioPlayer />);
      const image = screen.getByAltText('Test Track');
      expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('displays track tags', () => {
      render(<GlobalAudioPlayer />);
      expect(screen.getByText(/rock, indie/i)).toBeInTheDocument();
    });

    it('does not render when no track is playing', () => {
      mockUseAudioPlayer.mockReturnValue({ ...defaultMockData, currentTrack: null });
      mockUseAudioPlayerSafe.mockReturnValue({ ...defaultMockData, currentTrack: null });
      const { container } = render(<GlobalAudioPlayer />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Playback Controls', () => {
    it('has play/pause button', () => {
      render(<GlobalAudioPlayer />);
      const playPauseButton = screen.getByRole('button', { name: /Пауза/i });
      expect(playPauseButton).toBeInTheDocument();
    });

    it('calls togglePlayPause when play/pause button is clicked', () => {
      render(<GlobalAudioPlayer />);
      const playPauseButton = screen.getByRole('button', { name: /Пауза/i });
      fireEvent.click(playPauseButton);
      expect(defaultMockData.togglePlayPause).toHaveBeenCalled();
    });

    it('has previous and next buttons', () => {
      render(<GlobalAudioPlayer />);
      expect(screen.getByRole('button', { name: /Предыдущий трек/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Следующий трек/i })).toBeInTheDocument();
    });

    it('calls playPrevious when previous button is clicked', () => {
      render(<GlobalAudioPlayer />);
      const previousButton = screen.getByRole('button', { name: /Предыдущий трек/i });
      fireEvent.click(previousButton);
      expect(defaultMockData.playPrevious).toHaveBeenCalled();
    });
  });

  describe('Volume Control', () => {
    it('has volume slider', () => {
      render(<GlobalAudioPlayer />);
      const volumeSlider = screen.getByRole('slider', { name: /Volume/i });
      expect(volumeSlider).toBeInTheDocument();
    });

    it('has mute/unmute button', () => {
      render(<GlobalAudioPlayer />);
      expect(screen.getByRole('button', { name: /Выключить звук/i })).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('displays current time and duration', () => {
      render(<GlobalAudioPlayer />);
      expect(screen.getByText('0:30')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('has seek slider', () => {
      render(<GlobalAudioPlayer />);
      expect(screen.getByRole('slider', { name: /seek progress/i })).toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('toggles play/pause on Space key', () => {
      render(<GlobalAudioPlayer />);
      fireEvent.keyDown(window, { code: 'Space' });
      expect(defaultMockData.togglePlayPause).toHaveBeenCalled();
    });

    it('seeks forward on ArrowRight', () => {
      render(<GlobalAudioPlayer />);
      fireEvent.keyDown(window, { code: 'ArrowRight' });
      expect(defaultMockData.seekTo).toHaveBeenCalledWith(40); // 30 + 10
    });

    it('adjusts volume on ArrowUp/ArrowDown', () => {
      render(<GlobalAudioPlayer />);
      fireEvent.keyDown(window, { code: 'ArrowUp' });
      expect(defaultMockData.setVolume).toHaveBeenCalledWith(expect.closeTo(0.8));
    });
  });

  describe('Mobile View', () => {
    it('renders MiniPlayer on mobile', () => {
      mockUseIsMobile.mockReturnValue(true);
      render(<GlobalAudioPlayer />);
      expect(screen.getByTestId('mini-player')).toBeInTheDocument();
    });
  });
});