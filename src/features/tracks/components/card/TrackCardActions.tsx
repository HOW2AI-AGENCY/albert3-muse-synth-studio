import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  MoreVertical,
  Download,
  Share2,
  Globe,
  Sparkles,
  Search,
  Split,
  Expand,
  Mic2,
  UserPlus,
  FileAudio,
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { useConvertToWav } from '@/hooks/useConvertToWav';
import { getVersionShortLabel } from '@/utils/versionLabels';

interface Version {
  id: string;
  versionNumber: number;
  isOriginal: boolean;
  isMasterVersion: boolean;
}

interface TrackCardActionsProps {
  trackId: string;
  trackStatus: string;
  trackMetadata?: Record<string, any> | null;
  isPublic?: boolean;
  hasVocals?: boolean;
  isLiked: boolean;
  masterVersion: Version | null;
  operationTargetId: string;
  operationTargetVersion: {
    audio_url?: string;
  };
  onLikeClick: () => void;
  onDownloadClick: () => void;
  onShareClick: () => void;
  onTogglePublic: () => void;
  onDescribeTrack?: (trackId: string) => void;
  onRecognizeTrack?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
}

const WavConvertMenuItem = React.memo(({
  trackId,
  trackMetadata,
}: {
  trackId: string;
  trackMetadata: Record<string, any> | null | undefined;
}) => {
  const { convertToWav, isConverting, convertingTrackId } = useConvertToWav();

  const metadata = trackMetadata as Record<string, unknown> | null;
  const isMurekaTrack = metadata?.provider === 'mureka';
  const sunoTaskId = metadata?.suno_task_id as string | undefined;

  if (isMurekaTrack || !sunoTaskId) {
    return null;
  }

  const handleConvert = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isConverting && convertingTrackId === trackId) return;
      await convertToWav({ trackId });
    },
    [trackId, convertToWav, isConverting, convertingTrackId]
  );

  return (
    <DropdownMenuItem
      onClick={handleConvert}
      disabled={isConverting && convertingTrackId === trackId}
    >
      <FileAudio className="w-4 h-4 mr-2" />
      {isConverting && convertingTrackId === trackId ? 'Конвертация...' : 'Скачать WAV'}
    </DropdownMenuItem>
  );
});

WavConvertMenuItem.displayName = 'WavConvertMenuItem';

export const TrackCardActions = React.memo(({
  trackId,
  trackStatus,
  trackMetadata,
  isPublic,
  hasVocals,
  isLiked,
  masterVersion,
  operationTargetId,
  operationTargetVersion,
  onLikeClick,
  onDownloadClick,
  onShareClick,
  onTogglePublic,
  onDescribeTrack,
  onRecognizeTrack,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
}: TrackCardActionsProps) => {
  const isMurekaTrack = trackMetadata?.provider === 'mureka';
  const isSunoTrack = !isMurekaTrack;

  return (
    <div className="flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="icon-button-touch"
            onClick={(e) => {
              e.stopPropagation();
              onLikeClick();
            }}
            aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
          >
            <Heart className={cn('w-4 h-4', isLiked && 'fill-red-500 text-red-500')} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{isLiked ? 'Убрать из избранного' : 'В избранное'}</TooltipContent>
      </Tooltip>

      {trackStatus === 'completed' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="icon-button-touch"
              onClick={(e) => e.stopPropagation()}
              aria-label="Опции"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 z-[200]">
            <DropdownMenuItem onClick={onDownloadClick}>
              <Download className="w-4 h-4 mr-2" />
              Скачать MP3
            </DropdownMenuItem>
            <WavConvertMenuItem trackId={trackId} trackMetadata={trackMetadata} />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onShareClick}>
              <Share2 className="w-4 h-4 mr-2" />
              Поделиться
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onTogglePublic();
              }}
            >
              <Globe className="w-4 h-4 mr-2" />
              {isPublic ? 'Скрыть' : 'Опубликовать'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onDescribeTrack?.(trackId);
              }}
              disabled={!onDescribeTrack}
            >
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              AI Описание
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRecognizeTrack?.(trackId);
              }}
              disabled={!onRecognizeTrack || !operationTargetVersion.audio_url}
            >
              <Search className="w-4 h-4 mr-2 text-primary" />
              Распознать песню
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onSeparateStems?.(operationTargetId);
              }}
              disabled={!onSeparateStems || !operationTargetVersion.audio_url}
            >
              <Split className="w-4 h-4 mr-2" />
              {isMurekaTrack ? 'Скачать стемы архивом' : 'Разделить на стемы'}{' '}
              {masterVersion && masterVersion.id !== trackId &&
                `(${getVersionShortLabel({
                  versionNumber: masterVersion.versionNumber,
                  isOriginal: masterVersion.isOriginal,
                  isMaster: true,
                })})`}
            </DropdownMenuItem>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSunoTrack) onExtend?.(operationTargetId);
                    }}
                    disabled={!onExtend || isMurekaTrack || !operationTargetVersion.audio_url}
                    className={isMurekaTrack ? 'opacity-50' : ''}
                  >
                    <Expand className="w-4 h-4 mr-2" />
                    Расширить трек{' '}
                    {masterVersion && masterVersion.id !== trackId &&
                      `(${getVersionShortLabel({
                        versionNumber: masterVersion.versionNumber,
                        isOriginal: masterVersion.isOriginal,
                        isMaster: true,
                      })})`}
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>
              {isMurekaTrack && (
                <TooltipContent side="left">Расширение доступно только для Suno треков</TooltipContent>
              )}
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSunoTrack) onCover?.(operationTargetId);
                    }}
                    disabled={!onCover || isMurekaTrack || !operationTargetVersion.audio_url}
                    className={isMurekaTrack ? 'opacity-50' : ''}
                  >
                    <Mic2 className="w-4 h-4 mr-2" />
                    Создать кавер{' '}
                    {masterVersion && masterVersion.id !== trackId &&
                      `(${getVersionShortLabel({
                        versionNumber: masterVersion.versionNumber,
                        isOriginal: masterVersion.isOriginal,
                        isMaster: true,
                      })})`}
                  </DropdownMenuItem>
                </div>
              </TooltipTrigger>
              {isMurekaTrack && (
                <TooltipContent side="left">Кавер доступен только для Suno треков</TooltipContent>
              )}
            </Tooltip>

            {!hasVocals && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onAddVocal?.(operationTargetId);
                }}
                disabled={!onAddVocal || !operationTargetVersion.audio_url}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить вокал{' '}
                {masterVersion && masterVersion.id !== trackId &&
                  `(${getVersionShortLabel({
                    versionNumber: masterVersion.versionNumber,
                    isOriginal: masterVersion.isOriginal,
                    isMaster: true,
                  })})`}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

TrackCardActions.displayName = 'TrackCardActions';
