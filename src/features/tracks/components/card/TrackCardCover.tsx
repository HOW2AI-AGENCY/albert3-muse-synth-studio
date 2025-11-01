import React from 'react';
import { LazyImage } from '@/components/ui/lazy-image';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Music, Mic, FileAudio, Play, Pause } from '@/utils/iconImports';
import { TrackVariantSelector } from '../TrackVariantSelector';
import { cn } from '@/lib/utils';

interface TrackCardCoverProps {
  coverUrl?: string;
  title: string;
  gradient: string;
  hasVocals?: boolean;
  hasReferenceAudio?: boolean;
  isCompleted: boolean;
  trackId: string;
  currentVersionIndex: number;
  onVersionChange: (index: number) => void;
  isHovered: boolean;
  isCurrentTrack: boolean;
  isPlaying: boolean;
  playButtonDisabled: boolean;
  onPlayClick: (e: React.MouseEvent) => void;
}

export const TrackCardCover = React.memo(({
  coverUrl,
  title,
  gradient,
  hasVocals,
  hasReferenceAudio,
  isCompleted,
  trackId,
  currentVersionIndex,
  onVersionChange,
  isHovered,
  isCurrentTrack,
  isPlaying,
  playButtonDisabled,
  onPlayClick,
}: TrackCardCoverProps) => {
  return (
    <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900">
      {/* Vocal/Instrumental badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm p-1.5 rounded-md cursor-help">
            {hasVocals ? (
              <Mic className="h-4 w-4 text-primary" />
            ) : (
              <Music className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {hasVocals ? 'С вокалом' : 'Инструментал'}
        </TooltipContent>
      </Tooltip>

      {/* Reference Audio Badge */}
      {hasReferenceAudio && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="absolute bottom-2 left-2 z-10 bg-amber-500/90 backdrop-blur-sm p-1.5 rounded-md cursor-help">
              <FileAudio className="h-4 w-4 text-white" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Создано с аудио-референсом</TooltipContent>
        </Tooltip>
      )}

      {/* Variant selector */}
      {isCompleted && (
        <div className="absolute top-2 right-2 z-10">
          <TrackVariantSelector
            trackId={trackId}
            currentVersionIndex={currentVersionIndex}
            onVersionChange={onVersionChange}
          />
        </div>
      )}

      {/* Cover image */}
      {coverUrl ? (
        <LazyImage
          src={coverUrl || '/placeholder.svg'}
          alt={`Обложка трека ${title}`}
          placeholder="/placeholder.svg"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          wrapperClassName="w-full h-full"
        />
      ) : (
        <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
          <Music className="w-8 h-8 text-primary/50" />
        </div>
      )}

      {/* Play overlay */}
      {isCompleted && (
        <div
          className={cn(
            "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300",
            isHovered || (isCurrentTrack && isPlaying)
              ? "opacity-100"
              : "opacity-0 group-focus-within:opacity-100"
          )}
        >
          <Button
            variant="secondary"
            size="icon"
            onClick={onPlayClick}
            disabled={playButtonDisabled}
            className="rounded-full w-10 h-10 shadow-lg hover:scale-110 transition-transform"
            aria-label={isCurrentTrack && isPlaying ? "Приостановить" : "Воспроизвести"}
          >
            {isCurrentTrack && isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
});

TrackCardCover.displayName = 'TrackCardCover';
