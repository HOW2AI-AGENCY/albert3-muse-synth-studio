/**
 * TrackRowEnhanced Component
 *
 * Enhanced compact list-view card for track display with full version support
 * Improvements over original TrackRow:
 * - Version selection and management
 * - Unified TrackActionsMenu
 * - Works with Track domain type
 * - Uses shared useTrackState hook
 * - Better accessibility
 * - Smooth animations
 *
 * @version 2.0.0
 * @created 2025-11-07
 */

import { memo, useCallback, useMemo } from 'react';
import { Play, Pause, Clock, Split, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UnifiedTrackActionsMenu } from '@/components/tracks/shared/TrackActionsMenu.unified';
import { TrackVariantSelector } from '@/features/tracks/components/TrackVariantSelector';
import { useTrackState } from '@/hooks/useTrackState';
import { useConvertToWav } from '@/hooks/useConvertToWav';
import { useToast } from '@/hooks/use-toast';
import { formatDuration } from '@/utils/formatters';
import type { Track } from '@/types/domain/track.types';
import { getLatestWavJob } from '@/services/wav.service';

interface TrackRowEnhancedProps {
  track: Track;
  showMenu?: boolean;
  showVersionSelector?: boolean;
  isSelected?: boolean;
  onOpenInspector?: (trackId: string) => void;

  // Action callbacks (для совместимости и расширяемости)
  onDescribeTrack?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onSync?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;

  className?: string;
}

/**
 * Get status badge styling
 */
const getStatusBadge = (status: string) => {
  const config: Record<
    string,
    { label: string; className: string }
  > = {
    draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
    pending: {
      label: 'Queued',
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
    processing: {
      label: 'Processing',
      className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 animate-pulse',
    },
    completed: {
      label: 'Ready',
      className: 'bg-green-500/10 text-green-600 dark:text-green-400',
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-500/10 text-red-600 dark:text-red-400',
    },
  };
  return config[status] || config.draft;
};

export const TrackRowEnhanced = memo<TrackRowEnhancedProps>(
  ({
    track,
    showMenu = true,
    showVersionSelector = true,
    isSelected = false,
    onOpenInspector,
    onDescribeTrack,
    onSeparateStems,
    onExtend,
    onCover,
    onAddVocal,
    onCreatePersona,
    onSync,
    onRetry,
    onDelete,
    className,
  }) => {
    // Use shared track state hook
    const {
      selectedVersionIndex,
      displayedVersion,
      isLiked,
      isCurrentTrack,
      isPlaying,
      playButtonDisabled,
      hasStems,
      versionCount,
      handleVersionChange,
      handlePlayClick,
      handleLikeClick,
      handleDownloadClick,
      handleTogglePublic,
      handleShareClick,
    } = useTrackState(track);

    // WAV conversion hook
    const { convertToWav, downloadWav, isConverting, convertingTrackId } = useConvertToWav();
    const { toast } = useToast();
    const handleConvertToWav = useCallback(() => {
      // Конвертация выполняется для текущей версии/всего трека
      // audioId необязателен — edge-функция определит его из метаданных
      void convertToWav({ trackId: track.id });
    }, [convertToWav, track.id]);

    const handleDownloadWavAction = useCallback(async (tid: string) => {
      try {
        const job = await getLatestWavJob(tid);
        if (!job || job.status !== 'completed' || !job.wav_url) {
          toast({
            title: 'WAV ещё не готов',
            description: 'Сначала запустите конвертацию, или подождите её завершения.',
          });
          return;
        }

        const title = displayedVersion.title || track.title || 'track';
        await downloadWav(job.wav_url, title);
      } catch (err) {
        toast({
          title: 'Ошибка проверки WAV',
          description: 'Не удалось получить статус конвертации.',
          variant: 'destructive',
        });
      }
    }, [downloadWav, displayedVersion.title, track.title, toast]);

    const statusBadge = getStatusBadge(track.status);
    const canPlay = track.status === 'completed';
    const showProcessing = track.status === 'processing' || track.status === 'pending';
    const formattedDuration = displayedVersion.duration
      ? formatDuration(displayedVersion.duration)
      : null;

    const handleRowClick = useCallback(() => {
      if (onOpenInspector) {
        onOpenInspector(track.id);
      }
    }, [onOpenInspector, track.id]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.key) {
          case 'Enter':
          case ' ':
            e.preventDefault();
            if (canPlay) {
              handlePlayClick();
            }
            break;
          case 'l':
          case 'L':
            e.preventDefault();
            handleLikeClick();
            break;
        }
      },
      [canPlay, handlePlayClick, handleLikeClick]
    );

    // Метаданные трека для меню действий, мемоизируем чтобы избежать лишних перерисовок
    const memoizedTrackMetadata = useMemo(
      () => ({
        ...(track.metadata || {}),
        wavConverting: isConverting && convertingTrackId === track.id,
      }),
      [track.metadata, isConverting, convertingTrackId, track.id]
    );

    // Total versions including main
    const totalVersions = versionCount + 1;

    return (
      <div
        role="listitem"
        aria-label={`Track: ${displayedVersion.title || track.title}`}
        aria-selected={isSelected}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={handleRowClick}
        className={cn(
          'group relative flex items-center gap-3 p-3 rounded-lg transition-all duration-200',
          'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          'border border-transparent hover:border-accent',
          isSelected && 'bg-accent/30 border-accent',
          isCurrentTrack && 'bg-primary/5 border-primary/30',
          track.status === 'failed' && 'opacity-70',
          'cursor-pointer',
          className
        )}
      >
        {/* Left: Thumbnail + Play/Pause Overlay + Version Selector */}
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'relative w-14 h-14 rounded-md overflow-hidden bg-muted',
              'ring-2 ring-transparent transition-all',
              isCurrentTrack && 'ring-primary'
            )}
          >
            {displayedVersion.cover_url || track.cover_url ? (
              <img
                src={displayedVersion.cover_url || track.cover_url || ''}
                alt={`${displayedVersion.title || track.title} cover`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40" />
              </div>
            )}

            {/* Play/Pause Overlay */}
            {canPlay && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayClick();
                }}
                disabled={playButtonDisabled}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                aria-pressed={isPlaying}
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  'bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-200',
                  isPlaying && 'opacity-100',
                  'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                )}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" fill="currentColor" />
                ) : (
                  <Play className="w-6 h-6 text-white" fill="currentColor" />
                )}
              </button>
            )}

            {/* Processing Indicator */}
            {showProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Version Selector Badge (Mini) */}
          {showVersionSelector && totalVersions > 1 && track.status === 'completed' && (
            <div
              className="absolute -top-1 -right-1 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <TrackVariantSelector
                trackId={track.id}
                currentVersionIndex={selectedVersionIndex}
                onVersionChange={handleVersionChange}
                className="scale-75 origin-top-right"
              />
            </div>
          )}
        </div>

        {/* Center: Title, Meta, Badges */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-1.5 mb-1">
            <h3
              className={cn(
                'text-sm font-semibold truncate',
                'text-foreground group-hover:text-primary transition-colors',
                isCurrentTrack && 'text-primary'
              )}
              title={displayedVersion.title || track.title}
            >
              {displayedVersion.title || track.title}
            </h3>

            {/* Stems Badge */}
            {hasStems && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Split className="h-3.5 w-3.5 text-primary shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Доступны стемы</TooltipContent>
              </Tooltip>
            )}

            {/* Master Version Badge */}
            {displayedVersion.isMasterVersion && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Мастер-версия</TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* Meta + Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {track.prompt && (
              <span className="truncate max-w-[300px]">{track.prompt}</span>
            )}
            {formattedDuration && (
              <>
                {track.prompt && (
                  <span className="text-muted-foreground/40">•</span>
                )}
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span className="font-mono">{formattedDuration}</span>
                </div>
              </>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge
              variant="secondary"
              className={cn('h-4 px-1.5 text-[10px] font-medium', statusBadge.className)}
            >
              {statusBadge.label}
            </Badge>

            {/* Version Count Badge */}
            {totalVersions > 1 && (
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-medium">
                {totalVersions} versions
              </Badge>
            )}
          </div>

          {/* Error Message */}
          {track.status === 'failed' && track.error_message && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-xs text-destructive truncate mt-1 cursor-help">
                  {track.error_message}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs">{track.error_message}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
          {showMenu && (
            <UnifiedTrackActionsMenu
              trackId={track.id}
              trackStatus={track.status}
              trackMetadata={memoizedTrackMetadata}
              currentVersionId={displayedVersion.id}
              versionNumber={displayedVersion.versionNumber}
              isMasterVersion={displayedVersion.isMasterVersion}
              variant="compact"
              showQuickActions={true}
              layout="flat"
              enableAITools={true}
              isPublic={track.is_public ?? false}
              hasVocals={track.has_vocals ?? false}
              isLiked={isLiked}
              onLike={handleLikeClick}
              onDownload={handleDownloadClick}
              onDownloadWav={handleDownloadWavAction}
              onShare={handleShareClick}
              onTogglePublic={handleTogglePublic}
              onDescribeTrack={onDescribeTrack}
              onSeparateStems={onSeparateStems}
              onConvertToWav={handleConvertToWav}
              onExtend={onExtend}
              onCover={onCover}
              onAddVocal={onAddVocal}
              onCreatePersona={onCreatePersona}
              onSync={onSync}
              onRetry={onRetry}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    );
  }
);

TrackRowEnhanced.displayName = 'TrackRowEnhanced';
