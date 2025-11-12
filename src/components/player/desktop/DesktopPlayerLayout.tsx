/**
 * Desktop Player Layout Component - Compact Floating Design
 * Modern, compact floating player with animations
 */
import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { AudioPlayerTrack } from '@/stores/audioPlayerStore';
import { useAudioPlayerStore, useIsPlaying, useVolume, usePlaybackModeControls } from '@/stores/audioPlayerStore';
import { usePlayerVisibility } from '../hooks/usePlayerVisibility';
import { usePlayerKeyboardShortcuts } from '../hooks/usePlayerKeyboardShortcuts';
import { PlaybackControls } from './PlaybackControls';
import { ProgressBar } from './ProgressBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Music, VolumeX, Volume1, Volume2, X, Mic2 } from '@/utils/iconImports';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LyricsDisplay } from '../LyricsDisplay';

export interface DesktopPlayerLayoutProps {
  track: AudioPlayerTrack;
}

export const DesktopPlayerLayout = memo(({ track }: DesktopPlayerLayoutProps) => {
  const { isVisible } = usePlayerVisibility(track);
  const [showKaraoke, setShowKaraoke] = useState(false);

  const isPlaying = useIsPlaying();
  const volume = useVolume();
  const availableVersions = useAudioPlayerStore((state) => state.availableVersions);
  const currentVersionIndex = useAudioPlayerStore((state) => state.currentVersionIndex);

  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);
  const setVolume = useAudioPlayerStore((state) => state.setVolume);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);
  const { toggleRepeatMode, toggleShuffle } = usePlaybackModeControls();

  const [isMuted, setIsMuted] = useState(false);
  const previousVolumeRef = useRef(volume);
  const volumeRef = useRef(volume);
  const isMutedRef = useRef(isMuted);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const shouldBeMuted = volume === 0;
    if (isMutedRef.current !== shouldBeMuted) {
      setIsMuted(shouldBeMuted);
    }
  }, [volume]);

  const hasVersions = useMemo(() => availableVersions.length > 1, [availableVersions]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      const restoreVolume = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.5;
      setVolume(restoreVolume);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume > 0 ? volume : 0.5;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, setVolume]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (newVolume > 0) {
      previousVolumeRef.current = newVolume;
    }
  }, [setVolume]);

  usePlayerKeyboardShortcuts({
    togglePlayPause,
    seekTo,
    setVolume,
    toggleMute,
    toggleRepeatMode,
    toggleShuffle,
  });

  const clearCurrentTrack = useAudioPlayerStore((state) => state.clearCurrentTrack);

  const handleClose = useCallback(() => {
    clearCurrentTrack();
  }, [clearCurrentTrack]);

  return (
    <>
    <div
      role="region"
      aria-label="Медиаплеер"
      className={`
        fixed
        bottom-4 left-4 right-4
        sm:bottom-5 sm:left-5 sm:right-5
        md:bottom-6 md:left-auto md:right-6 md:max-w-[420px]
        lg:bottom-8 lg:right-8
        xl:bottom-10 xl:right-10
        transition-all duration-500 ease-out
        ${isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95 pointer-events-none'}
      `}
      style={{ zIndex: 'var(--z-desktop-player)' }}
    >
      <div className="relative rounded-2xl overflow-hidden border-2 border-primary/20 shadow-2xl shadow-black/60 hover:shadow-primary/20 hover:border-primary/30 transition-all duration-300 group">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/98 via-slate-900/98 to-slate-950/98 backdrop-blur-3xl backdrop-saturate-150" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-accent/5 to-primary/8 opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
        
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />
        <div className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-primary shadow-glow-primary animate-pulse" />
        
        <div className="absolute -inset-2 bg-gradient-radial from-primary/15 via-accent/10 to-transparent blur-3xl opacity-60 group-hover:opacity-80 transition-opacity duration-500 -z-10" />

        <div className="relative px-3 py-2.5 space-y-2.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleClose}
                className="absolute top-1.5 right-1.5 h-5 w-5 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-all duration-200 z-10"
                aria-label="Закрыть плеер"
              >
                <X className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Закрыть плеер (Esc)</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-2.5">
            <div className="relative group/cover">
              <div className="relative w-11 h-11 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-300 group-hover/cover:scale-105">
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
                
                {isPlaying && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-primary pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1.05, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                )}
                
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
                <h4 className="font-semibold text-xs truncate text-foreground hover:text-primary transition-colors duration-200">
                  {track.title}
                </h4>
                {hasVersions && (
                  <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 border-primary/30">
                    V{track.versionNumber ?? currentVersionIndex + 1}
                  </Badge>
                )}
              </div>
              {track.style_tags && track.style_tags.length > 0 ? (
                <p className="text-[9px] text-muted-foreground/70 truncate mt-0.5">
                  {track.style_tags.slice(0, 2).join(', ')}
                </p>
              ) : (
                <p className="text-[9px] text-muted-foreground/70 mt-0.5">AI Generated</p>
              )}
            </div>
             {track.suno_task_id && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowKaraoke(!showKaraoke)}
                      className="h-6 w-6 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group/vol"
                    >
                      <Mic2 className="h-4 w-4 text-primary" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Караоке</TooltipContent>
                </Tooltip>
              )}
          </div>

          <div className="space-y-1">
            <ProgressBar onSeek={seekTo} />
          </div>

          <div className="flex items-center justify-between gap-2">
            <PlaybackControls 
              isPlaying={isPlaying}
              hasVersions={hasVersions}
              availableVersions={availableVersions}
              currentVersionIndex={currentVersionIndex}
              onTogglePlayPause={togglePlayPause}
              onSwitchVersion={switchToVersion}
            />

            <div
              className="flex items-center gap-1.5 min-w-[120px]"
              role="group"
              aria-label="Управление громкостью"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="h-6 w-6 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group/vol"
                    aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
                    aria-pressed={isMuted}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="h-3 w-3 group-hover/vol:text-primary transition-colors duration-200" aria-hidden="true" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="h-3 w-3 group-hover/vol:text-primary transition-colors duration-200" aria-hidden="true" />
                    ) : (
                      <Volume2 className="h-3 w-3 group-hover/vol:text-primary transition-colors duration-200" aria-hidden="true" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}</TooltipContent>
              </Tooltip>
              <div
                className="flex-1 min-w-[70px] max-w-[90px]"
                title={`Громкость: ${Math.round(volume * 100)}% (↑/↓)`}
              >
                <Slider
                  value={[volume]}
                  max={1}
                  step={0.01}
                  aria-label={`Громкость ${Math.round(volume * 100)}%`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(volume * 100)}
                  onValueChange={handleVolumeChange}
                  className="cursor-pointer hover:scale-y-125 transition-transform duration-200"
                />
              </div>
              <span
                className="text-[9px] font-medium text-muted-foreground/70 tabular-nums w-6 text-right"
                aria-live="polite"
                aria-atomic="true"
              >
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <Dialog open={showKaraoke} onOpenChange={setShowKaraoke}>
      <DialogContent className="max-w-4xl h-[70vh] bg-background/80 backdrop-blur-md flex flex-col" aria-describedby="karaoke-description">
        <DialogHeader>
          <DialogTitle>Караоке: {track.title}</DialogTitle>
          <DialogDescription id="karaoke-description">
            Синхронизированный текст песни с подсветкой слов в реальном времени
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {showKaraoke && (
            <LyricsDisplay
              taskId={track.suno_task_id ?? ''}
              audioId={track.id}
              fallbackLyrics={track.lyrics ?? ''}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
});

DesktopPlayerLayout.displayName = 'DesktopPlayerLayout';
