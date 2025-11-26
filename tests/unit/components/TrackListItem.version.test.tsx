import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip'; // TooltipProvider is required by shadcn/ui components

// The component being tested
import { TrackListItem } from '../../../src/design-system/components/compositions/TrackListItem/TrackListItem';

// Mock the mobile hook as the test is for mobile behavior
import { useIsMobile } from '@/hooks/use-mobile';
vi.mock('@/hooks/use-mobile');

// Mock data for the track and its versions
const mockVersions = [
  { id: 'v1', version_number: 1, audio_url: 'a1.mp3', is_master: true },
  { id: 'v2', version_number: 2, audio_url: 'a2.mp3', is_master: false },
];

const mockTrack = {
  id: 't1',
  title: 'Demo Track',
  audio_url: 'a1.mp3',
  cover_url: 'https://example.com/c.jpg',
  duration_seconds: 123,
  status: 'completed',
  style_tags: ['ambient'],
  versions: mockVersions, // The component expects versions to be part of the track object
};

describe('TrackListItem version switching (Mobile)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate a mobile environment
    (useIsMobile as vi.Mock).mockReturnValue(true);
  });

  it('allows switching versions via the mobile actions menu', async () => {
    // Create a mock function to act as the callback
    const handleVersionSelect = vi.fn();

    // Render the component within required providers
    render(
      <TooltipProvider>
        <TrackListItem
          track={mockTrack as any}
          actionMenuProps={{
            versions: mockVersions,
            onVersionSelect: handleVersionSelect,
            // Provide other necessary props for UnifiedTrackActionsMenu
            enableAITools: true,
            onDelete: vi.fn(),
            onDownload: vi.fn(),
            onSetMaster: vi.fn(),
            onShowDetails: vi.fn(),
            onToggleLike: vi.fn(),
          }}
        />
      </TooltipProvider>
    );

    // 1. Open the actions menu drawer
    // The UnifiedTrackActionsMenu renders a button with "More options" as its accessible name
    const menuTrigger = screen.getByRole('button', { name: /More options/i });
    fireEvent.click(menuTrigger);

    // 2. Find and click the "Versions" item to open the version list
    // In the mobile drawer, this will be a button.
    const versionsMenuItem = await screen.findByRole('button', { name: /Versions/i });
    fireEvent.click(versionsMenuItem);

    // 3. Find the specific version to switch to.
    // The items are likely rendered with an accessible name like "Version 2"
    const version2Button = await screen.findByText(/Version 2/i);
    expect(version2Button).not.toBeNull(); // Ensure the button is found

    // 4. Click to switch to version 2
    fireEvent.click(version2Button);

    // 5. Assert that the callback was called with the correct version object
    // The callback should be called with the full version object, not just an index.
    expect(handleVersionSelect).toHaveBeenCalledWith(mockVersions[1]);
  });
});
