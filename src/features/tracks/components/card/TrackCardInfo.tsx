import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Split } from '@/utils/iconImports';
import { TrackProgressBar } from '@/components/tracks/TrackProgressBar';
import { formatDuration } from '@/utils/formatters';

interface TrackCardInfoProps {
  title: string;
  prompt?: string;
  duration?: number;
  versionCount: number;
  hasStems: boolean;
  status: string;
  progressPercent?: number | null;
  createdAt: string;
}

export const TrackCardInfo = React.memo(({
  title,
  prompt,
  duration,
  versionCount,
  hasStems,
  status,
  progressPercent,
  createdAt,
}: TrackCardInfoProps) => {
  const formattedDuration = duration ? formatDuration(duration) : null;

  return (
    <>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary">
              {title}
            </h3>
            {hasStems && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Split className="h-3.5 w-3.5 text-primary shrink-0" />
                </TooltipTrigger>
                <TooltipContent>Доступны стемы</TooltipContent>
              </Tooltip>
            )}
          </div>
          {versionCount > 0}
        </div>
        
        <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{prompt}</p>
      </div>

      {(status === 'processing' || status === 'pending') && (
        <div className="mb-2">
          <TrackProgressBar
            progress={progressPercent || 0}
            status={status}
            createdAt={createdAt}
          />
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
        <div className="flex items-center gap-2">
          {formattedDuration && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formattedDuration}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

TrackCardInfo.displayName = 'TrackCardInfo';
