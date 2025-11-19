/**
 * Full Screen Player Mobile Component
 * Mobile-optimized fullscreen player with gestures
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { WaveformProgressBar } from '../mobile/WaveformProgressBar';
import { useAudioPlayerStore, useCurrentTrack, useIsPlaying, useVolume } from '@/stores/audioPlayerStore';
import { useTrackLike } from '@/features/tracks';
import { useFullScreenGestures } from './hooks/useFullScreenGestures';
import { FullScreenPlayerHeader } from './FullScreenPlayerHeader';
import { FullScreenPlayerControls } from './FullScreenPlayerControls';
import { FullScreenLyricsPanel } from './FullScreenLyricsPanel';
import { cn } from '@/lib/utils';

interface FullScreenPlayerMobileProps {
  onMinimize: () => void;
}

export const FullScreenPlayerMobile = memo(({ onMinimize }: FullScreenPlayerMobileProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const volume = useVolume();

  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);

  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const playNext = useAudioPlayerStore((state) => state.playNext);
  const playPrevious = useAudioPlayerStore((state) => state.playPrevious);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);

  const [isMuted, setIsMuted] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);

  useEffect(() => {
    setIsMuted(volume === 0);
  }, [volume]);

  const { isLiked, toggleLike } = useTrackLike(
    currentTrack?.id ?? "", 
    0
  );

  const handleVolumeChange = useCallback((value: number[]) => {
    setVolume(value[0]);
  }, [setVolume]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(0.5);
    } else {
      setVolume(0);
    }
  }, [isMuted, setVolume]);

  const toggleLyricsVisibility = useCallback(() => {
    setShowLyrics(prev => !prev);
  }, []);

  // Gesture handlers
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useFullScreenGestures({
    onSwipeDown: onMinimize,
    onDoubleTap: togglePlayPause,
  });

  if (!currentTrack) return null;

  const hasVersions = availableVersions.length > 1;

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-background via-background/95 to-card/90 backdrop-blur-xl animate-fade-in overflow-y-auto touch-optimized"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 'var(--z-fullscreen-player)'
      }}
      role="dialog"
      aria-label="Полноэкранный плеер"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
      <div className="relative flex-1 flex flex-col items-center justify-start px-[--space-3] md:px-[--space-6] py-[--space-4] md:py-[--space-8] overflow-y-auto">
        {/* Album Art */}
        <div className="relative w-full max-w-[280px] md:max-w-sm aspect-square mb-[--space-4] md:mb-[--space-8]">
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
            <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm flex items-center gap-2 shadow-lg">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              <span className="text-xs font-medium text-white">Playing</span>
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="text-center px-[--space-3] md:px-[--space-4] mb-[--space-4] md:mb-[--space-6] animate-fade-in">
          <div className="flex items-center justify-center gap-[--space-2] mb-[--space-1.5] md:mb-[--space-2]">
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-gradient-primary line-clamp-2 transition-all duration-300">
              {currentTrack.title}
            </h2>
            {hasVersions && (
              <Badge variant="secondary" className="text-xs md:text-sm animate-scale-in">
                V{currentTrack.versionNumber ?? currentVersionIndex + 1}
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm lg:text-base text-muted-foreground/80 truncate transition-opacity duration-300">
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
          />
        )}

        {/* Waveform Progress */}
        <WaveformProgressBar
          audioUrl={currentTrack.audio_url || currentTrack.storage_audio_url || ''}
          onSeek={(time: number) => seekTo(time)}
          className="w-full mb-[--space-4] md:mb-[--space-6]"
          height={64}
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
        />
      </div>
    </div>
  );
});

FullScreenPlayerMobile.displayName = 'FullScreenPlayerMobile';
