/**
 * Desktop Player Layout Component
 * Full refactored desktop player with all controls
 */
import { memo } from 'react';
import type { AudioPlayerTrack } from '@/stores/audioPlayerStore';
import { usePlayerVisibility } from '../hooks/usePlayerVisibility';
import { TrackInfo } from './TrackInfo';
import { PlaybackControls } from './PlaybackControls';
import { ProgressBar } from './ProgressBar';
import { VolumeControl } from './VolumeControl';

export interface DesktopPlayerLayoutProps {
  track: AudioPlayerTrack;
}

export const DesktopPlayerLayout = memo(({ track }: DesktopPlayerLayoutProps) => {
  const { isVisible } = usePlayerVisibility(track);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[60] transition-all duration-500 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}
    >
      {/* Background blur and gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/90 to-background/80 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      
      {/* Top border with glow effect */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-primary/80 shadow-glow-primary animate-pulse" />
      
      <div className="relative container mx-auto px-4 py-4">
        <div className="flex items-center gap-6">
          {/* Track Info */}
          <div className="min-w-0 flex-1 max-w-xs">
            <TrackInfo track={track} />
          </div>

          {/* Playback Controls & Progress Bar */}
          <div className="flex flex-col items-center gap-3 flex-1 max-w-2xl">
            <PlaybackControls />
            <ProgressBar />
          </div>

          {/* Volume & Other Controls */}
          <div className="flex items-center gap-4 min-w-[200px]">
            <VolumeControl />
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopPlayerLayout.displayName = 'DesktopPlayerLayout';
