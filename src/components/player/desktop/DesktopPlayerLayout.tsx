/**
 * Desktop Player Layout Component
 * Full refactored desktop player with all controls
 */
import { memo, useState, useCallback, useMemo } from 'react';
import type { AudioPlayerTrack } from '@/stores/audioPlayerStore';
import { useAudioPlayerStore, useIsPlaying, useVolume } from '@/stores/audioPlayerStore';
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
  
  // Zustand store selectors
  const isPlaying = useIsPlaying();
  const volume = useVolume();
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const duration = useAudioPlayerStore((state) => state.duration);
  const bufferingProgress = useAudioPlayerStore((state) => state.bufferingProgress);
  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);
  
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  // Volume control state
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(volume);

  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, setVolume, previousVolume, volume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (newVolume > 0) setPreviousVolume(newVolume);
  }, [setVolume]);

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 transition-all duration-500 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      }`}
      style={{ zIndex: 'var(--z-desktop-player)' }}
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
            <TrackInfo 
              track={track} 
              isPlaying={isPlaying}
              hasVersions={hasVersions}
              currentVersionIndex={currentVersionIndex}
            />
          </div>

          {/* Playback Controls & Progress Bar */}
          <div className="flex flex-col items-center gap-3 flex-1 max-w-2xl">
            <PlaybackControls 
              isPlaying={isPlaying}
              hasVersions={hasVersions}
              availableVersions={availableVersions}
              currentVersionIndex={currentVersionIndex}
              onTogglePlayPause={togglePlayPause}
              onPlayPrevious={playPrevious}
              onPlayNext={playNext}
              onSwitchVersion={switchToVersion}
            />
            <ProgressBar 
              currentTime={currentTime}
              duration={duration}
              bufferingProgress={bufferingProgress}
              onSeek={seekTo}
            />
          </div>

          {/* Volume & Other Controls */}
          <div className="flex items-center gap-4 min-w-[200px]">
            <VolumeControl 
              volume={volume}
              isMuted={isMuted}
              onToggleMute={toggleMute}
              onVolumeChange={handleVolumeChange}
              onClose={() => {}} // No close button needed in desktop
            />
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopPlayerLayout.displayName = 'DesktopPlayerLayout';

