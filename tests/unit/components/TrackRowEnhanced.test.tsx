/**
 * TrackRowEnhanced Component Tests
 *
 * Tests for the enhanced track row component with version support
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackRowEnhanced } from '@/components/tracks/TrackRowEnhanced';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { Track } from '@/types/domain/track.types';

// Mock dependencies
vi.mock('@/hooks/useTrackState', () => ({
  useTrackState: vi.fn(() => ({
    selectedVersionIndex: 0,
    displayedVersion: {
      id: 'version-1',
      title: 'Test Track V1',
      audio_url: 'https://example.com/audio.mp3',
      cover_url: 'https://example.com/cover.jpg',
      duration: 180,
      versionNumber: 1,
      isMasterVersion: true,
      parentTrackId: 'track-123',
    },
    isLiked: false,
    likeCount: 0,
    isCurrentTrack: false,
    isPlaying: false,
    playButtonDisabled: false,
    hasStems: false,
    versionCount: 0,
    handleVersionChange: vi.fn(),
    handlePlayClick: vi.fn(),
    handleLikeClick: vi.fn(),
    handleDownloadClick: vi.fn(),
    handleTogglePublic: vi.fn(),
    handleShareClick: vi.fn(),
  })),
}));

vi.mock('@/features/tracks/components/TrackVariantSelector', () => ({
  TrackVariantSelector: () => <div data-testid="version-selector">Version Selector</div>,
}));

vi.mock('@/components/tracks/shared/TrackActionsMenu.unified', () => ({
  UnifiedTrackActionsMenu: () => <div data-testid="actions-menu">Actions Menu</div>,
}));

// Wrapper with TooltipProvider for all tests
const renderWithProviders = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe('TrackRowEnhanced', () => {
  const mockTrack: Track = {
    id: 'track-123',
    title: 'Test Track',
    prompt: 'Test prompt',
    status: 'completed',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 180,
    created_at: '2025-11-07T00:00:00Z',
    user_id: 'user-123',
    is_public: false,
    has_vocals: true,
    style_tags: ['rock', 'indie'],
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders track title', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      expect(screen.getByText('Test Track V1')).toBeInTheDocument();
    });

    it('renders track prompt', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      expect(screen.getByText('Test prompt')).toBeInTheDocument();
    });

    it('renders cover image when available', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const coverImage = screen.getByAlt(/test track v1 cover/i);
      expect(coverImage).toBeInTheDocument();
      expect(coverImage).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('renders status badge', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      expect(screen.getByText(/ready/i)).toBeInTheDocument();
    });
  });

  describe('Version Support', () => {
    it('shows version selector when showVersionSelector is true and multiple versions exist', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        versionCount: 2, // 2 additional versions + main = 3 total
      });

      renderWithProviders(
        <TrackRowEnhanced track={mockTrack} showVersionSelector={true} />
      );

      expect(screen.getByTestId('version-selector')).toBeInTheDocument();
    });

    it('does not show version selector when only one version exists', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        versionCount: 0, // Only main version
      });

      renderWithProviders(
        <TrackRowEnhanced track={mockTrack} showVersionSelector={true} />
      );

      expect(screen.queryByTestId('version-selector')).not.toBeInTheDocument();
    });

    it('does not show version selector when showVersionSelector is false', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        versionCount: 2,
      });

      renderWithProviders(
        <TrackRowEnhanced track={mockTrack} showVersionSelector={false} />
      );

      expect(screen.queryByTestId('version-selector')).not.toBeInTheDocument();
    });

    it('shows version count badge when multiple versions exist', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        versionCount: 2, // 3 total versions
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      expect(screen.getByText(/3 versions/i)).toBeInTheDocument();
    });
  });

  describe('Play Controls', () => {
    it('shows play button for completed tracks', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const playButton = screen.getByLabelText(/play/i);
      expect(playButton).toBeInTheDocument();
    });

    it('calls handlePlayClick when play button is clicked', () => {
      const mockHandlePlayClick = vi.fn();
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        handlePlayClick: mockHandlePlayClick,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const playButton = screen.getByLabelText(/play/i);
      fireEvent.click(playButton);

      expect(mockHandlePlayClick).toHaveBeenCalled();
    });

    it('shows pause icon when track is currently playing', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        isCurrentTrack: true,
        isPlaying: true,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const pauseButton = screen.getByLabelText(/pause/i);
      expect(pauseButton).toBeInTheDocument();
    });
  });

  describe('Processing State', () => {
    it('shows processing indicator for processing tracks', () => {
      const processingTrack = { ...mockTrack, status: 'processing' as const };
      renderWithProviders(<TrackRowEnhanced track={processingTrack} />);

      expect(screen.getByText(/processing/i)).toBeInTheDocument();
    });

    it('does not show play button for processing tracks', () => {
      const processingTrack = { ...mockTrack, status: 'processing' as const };
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        playButtonDisabled: true,
      });

      renderWithProviders(<TrackRowEnhanced track={processingTrack} />);

      // Should have processing indicator, not play button
      expect(screen.queryByLabelText(/play/i)).not.toBeInTheDocument();
    });
  });

  describe('Failed State', () => {
    it('shows error message for failed tracks', () => {
      const failedTrack = {
        ...mockTrack,
        status: 'failed' as const,
        error_message: 'Generation failed',
      };
      renderWithProviders(<TrackRowEnhanced track={failedTrack} />);

      expect(screen.getByText(/failed/i)).toBeInTheDocument();
      expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
    });

    it('applies opacity to failed tracks', () => {
      const failedTrack = { ...mockTrack, status: 'failed' as const };
      const { container } = renderWithProviders(<TrackRowEnhanced track={failedTrack} />);

      const trackRow = container.firstChild;
      expect(trackRow).toHaveClass('opacity-70');
    });
  });

  describe('Badges', () => {
    it('shows stems badge when stems are available', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        hasStems: true,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      // Tooltip content
      expect(screen.getByText(/доступны стемы/i)).toBeInTheDocument();
    });

    it('shows master version badge for master version', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        displayedVersion: {
          ...useTrackState().displayedVersion,
          isMasterVersion: true,
        },
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      // Tooltip content
      expect(screen.getByText(/мастер-версия/i)).toBeInTheDocument();
    });
  });

  describe('Actions Menu', () => {
    it('renders actions menu when showMenu is true', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} showMenu={true} />);

      expect(screen.getByTestId('actions-menu')).toBeInTheDocument();
    });

    it('does not render actions menu when showMenu is false', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} showMenu={false} />);

      expect(screen.queryByTestId('actions-menu')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onOpenInspector when row is clicked', () => {
      const onOpenInspector = vi.fn();
      renderWithProviders(
        <TrackRowEnhanced track={mockTrack} onOpenInspector={onOpenInspector} />
      );

      const trackRow = screen.getByRole('listitem');
      fireEvent.click(trackRow);

      expect(onOpenInspector).toHaveBeenCalledWith(mockTrack.id);
    });

    it('handles keyboard navigation (Enter key)', () => {
      const mockHandlePlayClick = vi.fn();
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        handlePlayClick: mockHandlePlayClick,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const trackRow = screen.getByRole('listitem');
      fireEvent.keyDown(trackRow, { key: 'Enter' });

      expect(mockHandlePlayClick).toHaveBeenCalled();
    });

    it('handles keyboard navigation (Space key)', () => {
      const mockHandlePlayClick = vi.fn();
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        handlePlayClick: mockHandlePlayClick,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const trackRow = screen.getByRole('listitem');
      fireEvent.keyDown(trackRow, { key: ' ' });

      expect(mockHandlePlayClick).toHaveBeenCalled();
    });

    it('handles like keyboard shortcut (L key)', () => {
      const mockHandleLikeClick = vi.fn();
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        handleLikeClick: mockHandleLikeClick,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const trackRow = screen.getByRole('listitem');
      fireEvent.keyDown(trackRow, { key: 'l' });

      expect(mockHandleLikeClick).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA label', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const trackRow = screen.getByRole('listitem');
      expect(trackRow).toHaveAttribute('aria-label', expect.stringContaining('Test Track V1'));
    });

    it('has tabindex for keyboard navigation', () => {
      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const trackRow = screen.getByRole('listitem');
      expect(trackRow).toHaveAttribute('tabindex', '0');
    });

    it('shows selected state when isSelected is true', () => {
      const { container } = renderWithProviders(
        <TrackRowEnhanced track={mockTrack} isSelected={true} />
      );

      const trackRow = container.firstChild;
      expect(trackRow).toHaveClass('bg-accent/30');
      expect(trackRow).toHaveClass('border-accent');
    });
  });

  describe('Current Track Highlight', () => {
    it('highlights current track with primary border', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        isCurrentTrack: true,
      });

      const { container } = renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const trackRow = container.firstChild;
      expect(trackRow).toHaveClass('bg-primary/5');
      expect(trackRow).toHaveClass('border-primary/30');
    });

    it('highlights thumbnail with primary ring when current track', () => {
      const { useTrackState } = require('@/hooks/useTrackState');
      useTrackState.mockReturnValue({
        ...useTrackState(),
        isCurrentTrack: true,
      });

      renderWithProviders(<TrackRowEnhanced track={mockTrack} />);

      const thumbnail = screen.getByAlt(/test track v1 cover/i).parentElement;
      expect(thumbnail).toHaveClass('ring-primary');
    });
  });
});
