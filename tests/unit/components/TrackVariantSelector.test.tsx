import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackVariantSelector } from '@/features/tracks/components/TrackVariantSelector';

// Мокаем хук useTrackVersions, чтобы контролировать количество версий
vi.mock('@/features/tracks/hooks', async () => {
  const actual = await vi.importActual<any>('@/features/tracks/hooks');
  return {
    ...actual,
    useTrackVersions: vi.fn((trackId: string) => ({
      isLoading: false,
      allVersions: [
        { id: `${trackId}-v1`, audio_url: 'audio1.mp3', versionNumber: 1, isMasterVersion: true },
        { id: `${trackId}-v2`, audio_url: 'audio2.mp3', versionNumber: 2, isMasterVersion: false },
      ],
      versions: [
        { id: `${trackId}-v2`, audio_url: 'audio2.mp3', versionNumber: 2, isMasterVersion: false },
      ],
      totalVersionCount: 2,
      additionalVersionCount: 1,
      mainVersion: { id: `${trackId}-v1`, audio_url: 'audio1.mp3', versionNumber: 1, isMasterVersion: true },
    })),
  };
});

describe('TrackVariantSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders two clickable version buttons and total count badge', () => {
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    const versionBtn1 = screen.getByRole('button', { name: /версия 1/i });
    const versionBtn2 = screen.getByRole('button', { name: /версия 2/i });
    const totalBadge = screen.getByLabelText('Всего версий: 2');

    expect(versionBtn1).toBeInTheDocument();
    expect(versionBtn2).toBeInTheDocument();
    expect(totalBadge).toBeInTheDocument();
  });

  it('calls onVersionChange with correct index when clicking buttons', () => {
    const onVersionChange = vi.fn();
    render(
      <TrackVariantSelector
        trackId="track-123"
        currentVersionIndex={0}
        onVersionChange={onVersionChange}
      />
    );

    const versionBtn1 = screen.getByRole('button', { name: /версия 1/i });
    const versionBtn2 = screen.getByRole('button', { name: /версия 2/i });

    fireEvent.click(versionBtn1);
    expect(onVersionChange).toHaveBeenCalledWith(0);

    fireEvent.click(versionBtn2);
    expect(onVersionChange).toHaveBeenCalledWith(1);
  });
});