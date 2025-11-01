/**
 * Desktop Player Layout Component - Compact Floating Design
 * Modern, compact floating player with animations
 */
import { memo, useState, useCallback, useMemo } from 'react';
import type { AudioPlayerTrack } from '@/stores/audioPlayerStore';
import { useAudioPlayerStore, useIsPlaying, useVolume } from '@/stores/audioPlayerStore';
import { usePlayerVisibility } from '../hooks/usePlayerVisibility';
import { PlaybackControls } from './PlaybackControls';
import { ProgressBar } from './ProgressBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Music, VolumeX, Volume1, Volume2, X } from '@/utils/iconImports';

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

  // Close player handler
  const clearCurrentTrack = useAudioPlayerStore((state) => state.clearCurrentTrack);
  
  const handleClose = useCallback(() => {
    clearCurrentTrack();
  }, [clearCurrentTrack]);

  return (
    <div
      className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md transition-all duration-500 ease-out ${
        isVisible 
          ? 'translate-y-0 opacity-100 scale-100' 
          : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
      }`}
      style={{ zIndex: 9999 }}
    >
      {/* Compact floating card with modern design */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl shadow-black/40 hover:shadow-glow-primary transition-shadow duration-300 group">
        {/* Strong contrast background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/98 via-gray-800/95 to-gray-900/98 backdrop-blur-2xl" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
        
        {/* Top accent line with animation */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
        <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary shadow-glow-primary animate-pulse" />
        
        {/* Outer glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-500 -z-10" />

        <div className="relative px-4 py-3">
          {/* Close button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={handleClose}
            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all duration-200 z-10"
            title="Закрыть плеер"
          >
            <X className="h-3.5 w-3.5" />
          </Button>

          {/* Track Info - Compact */}
          <div className="flex items-center gap-3 mb-3">
            <div className="relative group/cover">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-300 group-hover/cover:scale-105">
                {track.cover_url ? (
                  <img
                    src={track.cover_url}
                    alt={track.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/cover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-primary animate-pulse flex items-center justify-center">
                    <Music className="h-5 w-5 text-white/80" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                
                {/* Playing indicator */}
                {isPlaying && (
                  <div className="absolute bottom-1 right-1">
                    <div className="flex items-center gap-0.5">
                      <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                      <div className="w-0.5 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-0.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-sm truncate text-foreground hover:text-primary transition-colors duration-200">
                  {track.title}
                </h4>
                {hasVersions && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/30">
                    V{track.versionNumber ?? currentVersionIndex + 1}
                  </Badge>
                )}
              </div>
              {track.style_tags && track.style_tags.length > 0 ? (
                <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                  {track.style_tags.slice(0, 2).join(', ')}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">AI Generated</p>
              )}
            </div>
          </div>

          {/* Progress Bar - Compact */}
          <div className="mb-3">
            <ProgressBar 
              currentTime={currentTime}
              duration={duration}
              bufferingProgress={bufferingProgress}
              onSeek={seekTo}
            />
          </div>

          {/* Controls Row - Compact */}
          <div className="flex items-center justify-between gap-2">
            {/* Playback Controls - Smaller buttons */}
            <PlaybackControls 
              isPlaying={isPlaying}
              hasVersions={hasVersions}
              availableVersions={availableVersions}
              currentVersionIndex={currentVersionIndex}
              onTogglePlayPause={togglePlayPause}
              onSwitchVersion={switchToVersion}
            />

            {/* Volume Control - Compact */}
            <div className="flex items-center gap-1.5 min-w-[140px]">
              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMute}
                className="h-7 w-7 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group/vol"
                title={isMuted ? 'Включить звук' : 'Выключить звук'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-3.5 w-3.5 group-hover/vol:text-primary transition-colors duration-200" />
                ) : volume < 0.5 ? (
                  <Volume1 className="h-3.5 w-3.5 group-hover/vol:text-primary transition-colors duration-200" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5 group-hover/vol:text-primary transition-colors duration-200" />
                )}
              </Button>
              <div className="flex-1 min-w-[80px] max-w-[100px]">
                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  aria-label="Volume"
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer hover:scale-y-125 transition-transform duration-200"
                />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/70 tabular-nums w-7 text-right">
                {Math.round((isMuted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

DesktopPlayerLayout.displayName = 'DesktopPlayerLayout';

