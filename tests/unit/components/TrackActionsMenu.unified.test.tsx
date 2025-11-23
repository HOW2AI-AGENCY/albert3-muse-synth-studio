/**
 * UnifiedTrackActionsMenu Component Tests
 *
 * Tests for the unified track actions menu component
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import { UnifiedTrackActionsMenu } from '@/components/tracks/shared/TrackActionsMenu.unified';

describe('UnifiedTrackActionsMenu', () => {
  const mockTrackId = 'track-123';
  const mockVersionId = 'version-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Quick Actions', () => {
    it('renders like button when onLike is provided', () => {
      const onLike = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          onLike={onLike}
        />
      );

      const likeButton = screen.getByLabelText(/избранное/i);
      expect(likeButton).toBeInTheDocument();
    });

    it('shows liked state when isLiked is true', () => {
      const onLike = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          isLiked={true}
          onLike={onLike}
        />
      );

      const likeButton = screen.getByLabelText(/убрать из избранного/i);
      expect(likeButton).toBeInTheDocument();
    });

    it('renders download button for completed tracks when showQuickActions is true', () => {
      const onDownload = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          variant="compact"
          showQuickActions={true}
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.getByLabelText(/скачать mp3/i);
      expect(downloadButton).toBeInTheDocument();
    });

    it('does not render download button for processing tracks', () => {
      const onDownload = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="processing"
          variant="compact"
          showQuickActions={true}
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.queryByLabelText(/скачать mp3/i);
      expect(downloadButton).not.toBeInTheDocument();
    });

    it('calls onLike when like button is clicked', async () => {
      const onLike = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          onLike={onLike}
        />
      );

      const likeButton = screen.getByLabelText(/в избранное/i);
      fireEvent.click(likeButton);

      await waitFor(() => {
        expect(onLike).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Dropdown Menu', () => {
    it('renders dropdown menu trigger', () => {
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          onDownload={vi.fn()}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      expect(menuTrigger).toBeInTheDocument();
    });

    it('opens dropdown menu when trigger is clicked', async () => {
      const onDownload = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          onDownload={onDownload}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/скачать mp3/i)).toBeInTheDocument();
      });
    });
  });

  describe('Version Support', () => {
    it('displays version info when versionNumber is provided', async () => {
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          currentVersionId={mockVersionId}
          versionNumber={2}
          isMasterVersion={false}
          onDownload={vi.fn()}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/версия 2/i)).toBeInTheDocument();
      });
    });

    it('displays master badge for master version', async () => {
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          currentVersionId={mockVersionId}
          versionNumber={1}
          isMasterVersion={true}
          onDownload={vi.fn()}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/master/i)).toBeInTheDocument();
      });
    });
  });

  describe('Provider-Specific Features', () => {
    it('shows Suno-specific actions for Suno tracks', async () => {
      const onExtend = vi.fn();
      const onCover = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          trackMetadata={{ provider: 'suno' }}
          onExtend={onExtend}
          onCover={onCover}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/расширить трек/i)).toBeInTheDocument();
        expect(screen.getByText(/создать кавер/i)).toBeInTheDocument();
      });
    });

    it('shows Mureka hint for Mureka tracks', async () => {
      const onExtend = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          trackMetadata={{ provider: 'mureka' }}
          onExtend={onExtend}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/расширение\/кавер доступны только для suno/i)).toBeInTheDocument();
      });
    });
  });

  describe('AI Tools', () => {
    it('shows AI Description when enableAITools is true', async () => {
      const onDescribeTrack = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          enableAITools={true}
          onDescribeTrack={onDescribeTrack}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/ai описание/i)).toBeInTheDocument();
      });
    });

    it('does not show AI Description when enableAITools is false', async () => {
      const onDescribeTrack = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          enableAITools={false}
          onDescribeTrack={onDescribeTrack}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.queryByText(/ai описание/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Pro Features', () => {
    it.skip('shows Pro badge for stems when enableProFeatures is false', async () => {
      // TODO: Pro badge feature not yet implemented in UnifiedTrackActionsMenu
      // This test should be re-enabled once Pro badges are added to menu items
      const onSeparateStems = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          enableProFeatures={false}
          onSeparateStems={onSeparateStems}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        const stemsItem = screen.getByText(/разделить на стемы/i).closest('div');
        expect(stemsItem).toBeInTheDocument();
        expect(screen.getByText(/pro/i)).toBeInTheDocument();
      });
    });

    it('does not show Pro badge when enableProFeatures is true', async () => {
      const onSeparateStems = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          enableProFeatures={true}
          onSeparateStems={onSeparateStems}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.getByText(/разделить на стемы/i)).toBeInTheDocument();
        // Should not have Pro badge
        const proBadges = screen.queryAllByText(/^pro$/i);
        expect(proBadges.length).toBe(0);
      });
    });
  });

  describe('Track Status Handling', () => {
    it('shows sync button for processing tracks', async () => {
      const onSync = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="processing"
          onSync={onSync}
        />
      );

      // Button has tooltip, not aria-label
      await waitFor(() => {
        expect(screen.getByText(/обновить статус/i)).toBeInTheDocument();
      });
    });

    it('shows retry button for failed tracks', async () => {
      const onRetry = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="failed"
          onRetry={onRetry}
        />
      );

      // Button has tooltip with this text, not aria-label
      await waitFor(() => {
        expect(screen.getByText(/повторить генерацию/i)).toBeInTheDocument();
      });
    });

    it('does not show download for failed tracks', () => {
      const onDownload = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="failed"
          showQuickActions={true}
          onDownload={onDownload}
        />
      );

      const downloadButton = screen.queryByLabelText(/скачать mp3/i);
      expect(downloadButton).not.toBeInTheDocument();
    });
  });

  describe('Permissions', () => {
    it('does not show publish action when canPublish is false', async () => {
      const onPublish = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          canPublish={false}
          onPublish={onPublish}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        expect(screen.queryByText(/^publish$/i)).not.toBeInTheDocument();
      });
    });

    it('does not show delete action when canDelete is false', async () => {
      const onDelete = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          canDelete={false}
          onDelete={onDelete}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        // Updated label
        expect(screen.queryByText(/удалить трек/i)).not.toBeInTheDocument();
      });
    });

    it('deletes a track after confirmation', async () => {
      const onDelete = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          canDelete={true}
          onDelete={onDelete}
        />
      );

      // Open menu
      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      // Click delete button
      const deleteButton = await screen.findByText(/удалить трек/i);
      fireEvent.click(deleteButton);

      // Check for confirmation dialog
      const dialogTitle = await screen.findByText(/вы уверены/i);
      expect(dialogTitle).toBeInTheDocument();

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /удалить/i });
      fireEvent.click(confirmButton);

      // Check if onDelete was called
      await waitFor(() => {
        expect(onDelete).toHaveBeenCalledWith(mockTrackId);
      });
    });
  });

  describe('Layout Variants', () => {
    it('renders with flat layout', async () => {
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          layout="flat"
          onDownload={vi.fn()}
          onShare={vi.fn()}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        // Flat layout - no group labels
        expect(screen.queryByText(/creative/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/organization/i)).not.toBeInTheDocument();
      });
    });

    it('renders with categorized layout', async () => {
      const onRemix = vi.fn();
      const onAddToQueue = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          layout="categorized"
          onRemix={onRemix}
          onAddToQueue={onAddToQueue}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        // Categorized layout - should have group labels
        expect(screen.getByText(/creative/i)).toBeInTheDocument();
        expect(screen.getByText(/organization/i)).toBeInTheDocument();
      });
    });
  });

  describe('Action Callbacks', () => {
    it('calls onDescribeTrack with correct trackId', async () => {
      const onDescribeTrack = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          enableAITools={true}
          onDescribeTrack={onDescribeTrack}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        const aiDescBtn = screen.getByText(/ai описание/i);
        fireEvent.click(aiDescBtn);
      });

      expect(onDescribeTrack).toHaveBeenCalledWith(mockTrackId);
    });

    it('calls onSeparateStems with currentVersionId when provided', async () => {
      const onSeparateStems = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          currentVersionId={mockVersionId}
          onSeparateStems={onSeparateStems}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        const stemsBtn = screen.getByText(/разделить на стемы/i);
        fireEvent.click(stemsBtn);
      });

      expect(onSeparateStems).toHaveBeenCalledWith(mockVersionId);
    });

    it('calls onExtend with currentVersionId when provided', async () => {
      const onExtend = vi.fn();
      renderWithProviders(
        <UnifiedTrackActionsMenu
          trackId={mockTrackId}
          trackStatus="completed"
          trackMetadata={{ provider: 'suno' }}
          currentVersionId={mockVersionId}
          onExtend={onExtend}
        />
      );

      const menuTrigger = screen.getByRole('button', { name: /track actions menu/i });
      fireEvent.click(menuTrigger);

      await waitFor(() => {
        const extendBtn = screen.getByText(/расширить трек/i);
        fireEvent.click(extendBtn);
      });

      expect(onExtend).toHaveBeenCalledWith(mockVersionId);
    });
  });
});
