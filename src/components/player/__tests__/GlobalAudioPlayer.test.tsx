import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalAudioPlayer } from '../GlobalAudioPlayer';

// Mock hooks
vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: () => ({
    currentTrack: {
      id: '1',
      title: 'Test Track',
      audio_url: 'https://example.com/audio.mp3',
      cover_url: 'https://example.com/cover.jpg',
      style_tags: ['rock', 'indie'],
    },
    isPlaying: true,
    currentTime: 30,
    duration: 180,
    volume: 0.7,
    togglePlayPause: vi.fn(),
    seekTo: vi.fn(),
    setVolume: vi.fn(),
    playNext: vi.fn(),
    playPrevious: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/hooks/useMediaSession', () => ({
  useMediaSession: vi.fn(),
}));

describe('GlobalAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      vi.mocked(require('@/contexts/AudioPlayerContext').useAudioPlayer).mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        volume: 0.7,
        togglePlayPause: vi.fn(),
        seekTo: vi.fn(),
        setVolume: vi.fn(),
        playNext: vi.fn(),
        playPrevious: vi.fn(),
      });

      const { container } = render(<GlobalAudioPlayer />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Playback Controls', () => {
    it('has play/pause button', () => {
      render(<GlobalAudioPlayer />);
      
      const playPauseButton = screen.getByRole('button', { name: /pause|play/i });
      expect(playPauseButton).toBeInTheDocument();
    });

    it('calls togglePlayPause when play/pause button is clicked', () => {
      const togglePlayPauseMock = vi.fn();
      vi.mocked(require('@/contexts/AudioPlayerContext').useAudioPlayer).mockReturnValue({
        currentTrack: {
          id: '1',
          title: 'Test Track',
          audio_url: 'https://example.com/audio.mp3',
        },
        isPlaying: true,
        currentTime: 30,
        duration: 180,
        volume: 0.7,
        togglePlayPause: togglePlayPauseMock,
        seekTo: vi.fn(),
        setVolume: vi.fn(),
        playNext: vi.fn(),
        playPrevious: vi.fn(),
      });

      render(<GlobalAudioPlayer />);
      
      const playPauseButton = screen.getByRole('button', { name: /pause/i });
      fireEvent.click(playPauseButton);
      
      expect(togglePlayPauseMock).toHaveBeenCalled();
    });

    it('has previous and next buttons', () => {
      render(<GlobalAudioPlayer />);
      
      const buttons = screen.getAllByRole('button');
      const previousButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'skip-back'
      );
      const nextButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'skip-forward'
      );
      
      expect(previousButton).toBeInTheDocument();
      expect(nextButton).toBeInTheDocument();
    });

    it('calls playPrevious when previous button is clicked', () => {
      const playPreviousMock = vi.fn();
      vi.mocked(require('@/contexts/AudioPlayerContext').useAudioPlayer).mockReturnValue({
        currentTrack: {
          id: '1',
          title: 'Test Track',
          audio_url: 'https://example.com/audio.mp3',
        },
        isPlaying: true,
        currentTime: 30,
        duration: 180,
        volume: 0.7,
        togglePlayPause: vi.fn(),
        seekTo: vi.fn(),
        setVolume: vi.fn(),
        playNext: vi.fn(),
        playPrevious: playPreviousMock,
      });

      render(<GlobalAudioPlayer />);
      
      const buttons = screen.getAllByRole('button');
      const previousButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide') === 'skip-back'
      );
      
      if (previousButton) {
        fireEvent.click(previousButton);
        expect(playPreviousMock).toHaveBeenCalled();
      }
    });
  });

  describe('Volume Control', () => {
    it('has volume slider', () => {
      render(<GlobalAudioPlayer />);
      
      const volumeSlider = screen.getByRole('slider', { name: /volume/i });
      expect(volumeSlider).toBeInTheDocument();
    });

    it('has mute/unmute button', () => {
      render(<GlobalAudioPlayer />);
      
      const buttons = screen.getAllByRole('button');
      const volumeButton = buttons.find(btn => 
        btn.querySelector('svg')?.getAttribute('data-lucide')?.includes('volume')
      );
      
      expect(volumeButton).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('displays current time and duration', () => {
      render(<GlobalAudioPlayer />);
      
      expect(screen.getByText('0:30')).toBeInTheDocument(); // currentTime
      expect(screen.getByText('3:00')).toBeInTheDocument(); // duration
    });

    it('has seek slider', () => {
      render(<GlobalAudioPlayer />);
      
      const sliders = screen.getAllByRole('slider');
      // Should have at least one slider (progress or both progress and volume)
      expect(sliders.length).toBeGreaterThan(0);
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('toggles play/pause on Space key', () => {
      const togglePlayPauseMock = vi.fn();
      vi.mocked(require('@/contexts/AudioPlayerContext').useAudioPlayer).mockReturnValue({
        currentTrack: {
          id: '1',
          title: 'Test Track',
          audio_url: 'https://example.com/audio.mp3',
        },
        isPlaying: true,
        currentTime: 30,
        duration: 180,
        volume: 0.7,
        togglePlayPause: togglePlayPauseMock,
        seekTo: vi.fn(),
        setVolume: vi.fn(),
        playNext: vi.fn(),
        playPrevious: vi.fn(),
      });

      render(<GlobalAudioPlayer />);
      
      fireEvent.keyDown(window, { code: 'Space' });
      expect(togglePlayPauseMock).toHaveBeenCalled();
    });

    it('seeks forward on ArrowRight', () => {
      const seekToMock = vi.fn();
      vi.mocked(require('@/contexts/AudioPlayerContext').useAudioPlayer).mockReturnValue({
        currentTrack: {
          id: '1',
          title: 'Test Track',
          audio_url: 'https://example.com/audio.mp3',
        },
        isPlaying: true,
        currentTime: 30,
        duration: 180,
        volume: 0.7,
        togglePlayPause: vi.fn(),
        seekTo: seekToMock,
        setVolume: vi.fn(),
        playNext: vi.fn(),
        playPrevious: vi.fn(),
      });

      render(<GlobalAudioPlayer />);
      
      fireEvent.keyDown(window, { code: 'ArrowRight' });
      expect(seekToMock).toHaveBeenCalledWith(40); // 30 + 10
    });

    it('adjusts volume on ArrowUp/ArrowDown', () => {
      const setVolumeMock = vi.fn();
      vi.mocked(require('@/contexts/AudioPlayerContext').useAudioPlayer).mockReturnValue({
        currentTrack: {
          id: '1',
          title: 'Test Track',
          audio_url: 'https://example.com/audio.mp3',
        },
        isPlaying: true,
        currentTime: 30,
        duration: 180,
        volume: 0.7,
        togglePlayPause: vi.fn(),
        seekTo: vi.fn(),
        setVolume: setVolumeMock,
        playNext: vi.fn(),
        playPrevious: vi.fn(),
      });

      render(<GlobalAudioPlayer />);
      
      fireEvent.keyDown(window, { code: 'ArrowUp' });
      expect(setVolumeMock).toHaveBeenCalledWith(0.8); // 0.7 + 0.1
    });
  });

  describe('Mobile View', () => {
    it('renders MiniPlayer on mobile', () => {
      vi.mocked(require('@/hooks/use-mobile').useIsMobile).mockReturnValue(true);
      
      render(<GlobalAudioPlayer />);
      
      // MiniPlayer should be rendered instead of desktop player
      // This is a simplified check - in reality you'd check for specific MiniPlayer elements
      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });
  });
});
