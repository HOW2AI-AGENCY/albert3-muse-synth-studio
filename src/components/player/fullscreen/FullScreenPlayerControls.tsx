/**
 * Full Screen Player Controls Component
 * Playback controls, volume, and secondary actions
 */

import { memo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download, Heart } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FullScreenPlayerControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isLiked: boolean;
  currentTrack: {
    title: string;
    audio_url?: string;
  };
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
  onToggleLike: () => void;
  className?: string;
}

export const FullScreenPlayerControls = memo(({ 
  isPlaying,
  volume,
  isMuted,
  isLiked,
  currentTrack,
  onPlayPause,
  onPrevious,
  onNext,
  onVolumeChange,
  onToggleMute,
  onToggleLike,
  className,
}: FullScreenPlayerControlsProps) => {
  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();

  const handleDownload = useCallback(() => {
    vibrate('light');
    if (currentTrack?.audio_url) {
      const link = document.createElement('a');
      link.href = currentTrack.audio_url;
      link.download = `${currentTrack.title || 'track'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: "Загрузка началась",
        description: "Трек скачивается на устройство",
      });
    }
  }, [vibrate, currentTrack, toast]);

  return (
    <div className={cn("w-full animate-fade-in", className)}>
      {/* Primary Controls */}
      <div className="flex items-center justify-center gap-[--space-3] md:gap-[--space-6] mb-[--space-4] md:mb-[--space-6]">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            vibrate('light');
            onPrevious();
          }}
          className="h-11 w-11 md:h-12 md:w-12 lg:h-14 lg:w-14 hover:bg-primary/10 hover:scale-110 transition-all duration-200 touch-manipulation"
          aria-label="Предыдущий трек"
        >
          <SkipBack className="h-5 w-5 md:h-6 md:w-6" />
        </Button>

        <Button
          size="icon"
          onClick={() => {
            vibrate('light');
            onPlayPause();
          }}
          className="h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 rounded-full bg-gradient-primary hover:shadow-glow-primary hover:scale-110 transition-all duration-200 touch-manipulation"
          aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
        >
          {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 ml-1" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            vibrate('light');
            onNext();
          }}
          className="h-12 w-12 sm:h-14 sm:w-14 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          aria-label="Следующий трек"
        >
          <SkipForward className="h-6 w-6" />
        </Button>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-between mb-[--space-4] sm:mb-[--space-6] px-[--space-4] w-full max-w-lg mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            vibrate('light');
            onToggleLike();
          }}
          className={cn(
            "h-11 w-11 min-h-[44px] min-w-[44px] hover:scale-110 transition-all duration-200",
            isLiked ? 'text-accent hover:bg-accent/10' : 'hover:bg-primary/10'
          )}
          aria-label={isLiked ? "Убрать из избранного" : "Добавить в избранное"}
        >
          <Heart className={cn(
            "h-5 w-5 transition-all duration-200",
            isLiked && 'fill-accent text-accent animate-pulse'
          )} />
        </Button>

        <div className="flex items-center gap-[--space-2] flex-1 max-w-xs mx-[--space-4]">
          {/* ✅ FIX: Changed sm:h-8 to md:h-8 to maintain 44px minimum on mobile (HIGH) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              vibrate('light');
              onToggleMute();
            }}
            className="h-11 w-11 min-h-[44px] min-w-[44px] md:h-8 md:w-8 hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            aria-label={isMuted ? "Включить звук" : "Выключить звук"}
          >
            {isMuted ? <VolumeX className="h-5 w-5 sm:h-4 sm:w-4" /> : <Volume2 className="h-5 w-5 sm:h-4 sm:w-4" />}
          </Button>
          <Slider
            value={[volume]}
            max={1}
            step={0.01}
            onValueChange={onVolumeChange}
            className="flex-1 hover:scale-y-110 transition-transform duration-200 touch-optimized"
            aria-label="Громкость"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleDownload}
          className="h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-110 transition-all duration-200"
          aria-label="Скачать трек"
        >
          <Download className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}, (prev, next) => 
  prev.isPlaying === next.isPlaying &&
  prev.volume === next.volume &&
  prev.isMuted === next.isMuted &&
  prev.isLiked === next.isLiked &&
  prev.currentTrack.audio_url === next.currentTrack.audio_url
);

FullScreenPlayerControls.displayName = 'FullScreenPlayerControls';
