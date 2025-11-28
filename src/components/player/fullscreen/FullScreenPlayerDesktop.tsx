/**
 * Full Screen Player Desktop Component
 * Desktop-optimized fullscreen player with keyboard shortcuts
 */

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { MobileProgressBar } from '../mobile/MobileProgressBar';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume } from '@/stores/audioPlayerStore';
import { useTrackLike } from '@/features/tracks';
import { useFullScreenKeyboard } from './hooks/useFullScreenKeyboard';
import { FullScreenPlayerHeader } from './FullScreenPlayerHeader';
import { FullScreenPlayerControls } from './FullScreenPlayerControls';
import { FullScreenLyricsPanel } from './FullScreenLyricsPanel';
import { cn } from '@/lib/utils';

interface FullScreenPlayerDesktopProps {
  onMinimize: () => void;
}

export const FullScreenPlayerDesktop = memo(({ onMinimize }: FullScreenPlayerDesktopProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();

  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);
  const currentTime = useAudioPlayerStore((state) => state.currentTime);

  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const [isMuted, setIsMuted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);

  // ✅ FIX [React error #185]: Отслеживание mounted состояния
  // WHY: Callbacks могут быть вызваны после unmount (keyboard shortcuts, progress bar)
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setIsMuted(volume === 0);
  }, [volume]);

  const { isLiked, toggleLike } = useTrackLike(
    currentTrack?.id ?? "", 
    0
  );

  const handleVolumeChange = useCallback((value: number[]) => {
    if (isMountedRef.current) {
      setVolume(value[0]);
    }
  }, [setVolume]);

  const toggleMute = useCallback(() => {
    if (isMountedRef.current) {
      if (isMuted) {
        setVolume(0.5);
      } else {
        setVolume(0);
      }
    }
  }, [isMuted, setVolume]);

  const toggleLyricsVisibility = useCallback(() => {
    setShowLyrics(prev => !prev);
  }, []);

  const increaseVolume = useCallback(() => {
    if (isMountedRef.current) {
      setVolume(Math.min(volume + 0.1, 1));
    }
  }, [volume, setVolume]);

  const decreaseVolume = useCallback(() => {
    if (isMountedRef.current) {
      setVolume(Math.max(volume - 0.1, 0));
    }
  }, [volume, setVolume]);

  // ✅ FIX: Wrap seekForward and seekBackward in useCallback to prevent infinite re-renders
  // These functions capture currentTime in their closure, which updates 60 FPS
  // Without memoization, they are recreated every render, causing event listeners to be re-attached
  // This triggers Zustand updates which cause re-renders (infinite loop)
  const seekForwardCallback = useCallback((seconds: number) => {
    // ✅ FIX [React error #185]: Проверка mounted перед seekTo
    // WHY: Может быть вызван из keyboard shortcuts после unmount
    if (isMountedRef.current) {
      seekTo(Math.min(currentTime + seconds, 300));
    }
  }, [currentTime, seekTo]);

  const seekBackwardCallback = useCallback((seconds: number) => {
    // ✅ FIX [React error #185]: Проверка mounted перед seekTo
    // WHY: Может быть вызван из keyboard shortcuts после unmount
    if (isMountedRef.current) {
      seekTo(Math.max(currentTime - seconds, 0));
    }
  }, [currentTime, seekTo]);

  // ✅ FIX: Callback for progress bar seek to prevent inline function recreation
  const handleProgressBarSeek = useCallback((value: number[]) => {
    // ✅ FIX [React error #185]: Проверка mounted перед seekTo
    if (isMountedRef.current) {
      seekTo(value[0]);
    }
  }, [seekTo]);

  // Keyboard shortcuts
  useFullScreenKeyboard({
    togglePlayPause,
    seekForward: seekForwardCallback,
    seekBackward: seekBackwardCallback,
    toggleLyrics: toggleLyricsVisibility,
    exitFullScreen: onMinimize,
    increaseVolume,
    decreaseVolume,
    toggleMute,
  });

  if (!currentTrack) return null;

  const hasVersions = availableVersions.length > 1;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-background via-background/95 to-card/90 backdrop-blur-xl animate-fade-in overflow-y-auto"
      style={{
        zIndex: 'var(--z-fullscreen-player)'
      }}
      role="dialog"
      aria-label="Полноэкранный плеер"
    >
      {/* Header */}
      <FullScreenPlayerHeader
        currentTrack={currentTrack}
        showLyrics={showLyrics}
        onMinimize={onMinimize}
        onToggleLyrics={toggleLyricsVisibility}
        availableVersions={availableVersions}
        currentVersionIndex={currentVersionIndex}
        onSwitchVersion={switchToVersion}
      />

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col items-center justify-start px-[--space-6] md:px-[--space-8] py-[--space-6] md:py-[--space-8] overflow-y-auto max-w-7xl mx-auto">
        {/* Album Art */}
        <div className="relative w-full max-w-md lg:max-w-lg aspect-square mb-[--space-6] lg:mb-[--space-8]">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-3xl blur-3xl opacity-60 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-primary/20 rounded-3xl blur-2xl" />
          
          <img
            src={currentTrack?.cover_url || '/placeholder.svg'}
            alt={currentTrack?.title || 'Track'}
            className={cn(
              "relative w-full h-full object-cover rounded-3xl shadow-[0_8px_40px_-12px_hsl(var(--primary)/0.4)]",
              "ring-1 ring-white/10 transition-all duration-500",
              isPlaying && "scale-[1.02] shadow-[0_12px_48px_-12px_hsl(var(--primary)/0.6)]"
            )}
            loading="lazy"
          />
          
          {isPlaying && (
            <div className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-primary/90 backdrop-blur-sm flex items-center gap-2 shadow-lg">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white">Playing</span>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center px-[--space-4] mb-[--space-6] animate-fade-in">
          <div className="flex items-center justify-center gap-[--space-3] mb-[--space-2]">
            <h2 className="text-2xl lg:text-3xl xl:text-4xl font-bold text-gradient-primary line-clamp-2 transition-all duration-300">
              {currentTrack.title}
            </h2>
            {hasVersions && (
              <Badge variant="secondary" className="text-sm lg:text-base animate-scale-in">
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <p className="text-sm lg:text-base xl:text-lg text-muted-foreground/80 truncate transition-opacity duration-300">
            {currentTrack.style_tags?.join(' • ') || 'AI Generated'}
          </p>
        </div>

        {/* Lyrics */}
        {showLyrics && currentTrack?.suno_task_id && currentTrack?.suno_id && (
          <FullScreenLyricsPanel
            taskId={currentTrack.suno_task_id}
            audioId={currentTrack.suno_id}
            fallbackLyrics={currentTrack.lyrics}
            showLyrics={showLyrics}
            className="max-w-4xl"
          />
        )}

        {/* Progress */}
        <MobileProgressBar
          onSeek={handleProgressBarSeek}
          className="w-full max-w-4xl mb-[--space-6]"
        />

        {/* Controls */}
        <FullScreenPlayerControls
          isPlaying={isPlaying}
          volume={volume}
          isMuted={isMuted}
          isLiked={isLiked}
          currentTrack={currentTrack}
          onPlayPause={togglePlayPause}
          onPrevious={playPrevious}
          onNext={playNext}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleLike={toggleLike}
          className="max-w-4xl"
        />
      </div>
    </div>
  );
});

FullScreenPlayerDesktop.displayName = 'FullScreenPlayerDesktop';
