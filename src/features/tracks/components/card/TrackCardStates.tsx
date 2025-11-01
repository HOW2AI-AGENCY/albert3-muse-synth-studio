import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, RefreshCw, Trash2 } from '@/utils/iconImports';
import { TrackSyncStatus } from '@/components/tracks/TrackSyncStatus';

interface Track {
  id: string;
  status: string;
  created_at: string;
  metadata?: Record<string, any> | null;
}

interface GenerationProgressProps {
  track: Track;
  onSync?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}

export const GenerationProgress = React.memo(({
  track,
  onSync,
  onDelete,
}: GenerationProgressProps) => {
  const trackForSync = {
    id: track.id,
    status: track.status,
    created_at: track.created_at,
    metadata: track.metadata as Record<string, any> | null | undefined,
  };

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10 text-center transition-opacity duration-300">
      <div className="w-full max-w-[200px]">
        <TrackSyncStatus track={trackForSync} />
      </div>
      
      {(onSync || onDelete) && (
        <div className="flex gap-2 mt-3">
          {onSync && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync(track.id);
                  }}
                  className="h-8 w-8"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Обновить статус</TooltipContent>
            </Tooltip>
          )}
          {onDelete && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(track.id);
                  }}
                  className="h-8 w-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Удалить</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
});

GenerationProgress.displayName = 'GenerationProgress';

interface FailedStateProps {
  message?: string;
  trackId: string;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}

export const FailedState = React.memo(({
  message,
  trackId,
  onRetry,
  onDelete,
}: FailedStateProps) => (
  <div className="absolute inset-0 bg-destructive/70 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10 text-center">
    <AlertTriangle className="w-6 h-6 mb-2" />
    <h4 className="font-semibold text-sm">Ошибка</h4>
    <p className="text-xs text-destructive-foreground/80 line-clamp-2 mb-3">
      {message || "Не удалось создать трек."}
    </p>
    
    <div className="flex gap-2">
      {onRetry && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(trackId);
              }}
              className="h-8 w-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Повторить</TooltipContent>
        </Tooltip>
      )}
      {onDelete && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(trackId);
              }}
              className="h-8 w-8"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Удалить</TooltipContent>
        </Tooltip>
      )}
    </div>
  </div>
));

FailedState.displayName = 'FailedState';
