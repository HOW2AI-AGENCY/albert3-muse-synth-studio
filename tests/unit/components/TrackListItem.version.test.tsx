import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { TrackListItem } from '../../../src/design-system/components/compositions/TrackListItem/TrackListItem';
import { useIsMobile } from '@/hooks/use-mobile';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the mobile hook
vi.mock('@/hooks/use-mobile');

// Mock the VersionSwitcher component to isolate the test
vi.mock('@/components/tracks/shared/VersionSwitcher', () => ({
  VersionSwitcher: (props: any) => (
    <div>
      {/* Simulate the version list with simple buttons */}
      <button onClick={() => props.onVersionChange('v2', 2)}>Version 2</button>
      <button onClick={() => props.onVersionChange('v3', 3)}>Version 3</button>
    </div>
  ),
}));

// Mock data for the track
const mockTrack = {
  id: 't1',
  title: 'Demo Track',
  audio_url: 'a1.mp3',
  cover_url: 'https://example.com/c.jpg',
  duration_seconds: 123,
  status: 'completed',
  style_tags: ['ambient'],
  versions: [{ id: 'v1' }, { id: 'v2' }],
};

const queryClient = new QueryClient();

describe('TrackListItem version switching (Mobile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useIsMobile as vi.Mock).mockReturnValue(true);
  });

  it('allows switching versions via the mobile actions menu', async () => {
    const handleVersionChange = vi.fn();

    render(
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <TrackListItem
            track={mockTrack as any}
            actionMenuProps={{
              versions: mockTrack.versions,
              onVersionChange: handleVersionChange,
              enableAITools: true,
              onDelete: vi.fn(),
              onDownload: vi.fn(),
              onSetMaster: vi.fn(),
              onShowDetails: vi.fn(),
              onToggleLike: vi.fn(),
              currentVersionId: 'v1',
              versionNumber: 1,
            }}
          />
        </TooltipProvider>
      </QueryClientProvider>
    );

    // 1. Open the actions menu drawer
    const menuTrigger = screen.getByRole('button', { name: /Track actions menu/i });
    fireEvent.click(menuTrigger);

    // 2. The VersionSwitcher is now mocked and its content should be directly visible.
    // We can find the "Version 2" button from our mock.
    const version2Button = await screen.findByText(/Version 2/i);
    expect(version2Button).not.toBeNull();

    // 3. Click to switch to version 2
    fireEvent.click(version2Button);

    // 4. Assert that the callback was called with the correct parameters
    await waitFor(() => {
      expect(handleVersionChange).toHaveBeenCalledWith('v2', 2);
    });
  });
});
