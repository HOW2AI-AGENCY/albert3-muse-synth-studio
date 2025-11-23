import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, Split, Star, Heart } from '@/utils/iconImports';
import { TrackProgressBar } from '@/components/tracks/TrackProgressBar';
import { TrackStatusBadge } from '@/components/tracks/TrackStatusBadge';
import { formatDuration } from '@/utils/formatters';
import type { TrackStatus } from '@/components/tracks/track-status.types';

interface TrackCardInfoProps {
  title: string;
  prompt?: string;
  duration?: number | null;
  versionCount?: number;
  selectedVersionIndex?: number;
  hasStems: boolean;
  status: string;
  progressPercent?: number | null;
  createdAt: string;
  likeCount?: number | null;
  isMasterVersion?: boolean;
  onVersionChange?: (index: number) => void;
}

export const TrackCardInfo = memo(({
  title,
  prompt,
  duration,
  hasStems,
  status,
  progressPercent,
  createdAt,
  likeCount,
  isMasterVersion,
}: TrackCardInfoProps) => {
  const formattedDuration = duration ? formatDuration(duration) : null;

  return (
    <>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-lg md:text-xl leading-tight line-clamp-2 group-hover:text-primary flex-1 text-white">
                {title}
              </h3>
              <div className="flex items-center gap-1 shrink-0">
                {hasStems && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="shrink-0">
                        <Split className="h-3.5 w-3.5 text-primary" aria-label="Доступны стемы" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Доступны стемы</TooltipContent>
                  </Tooltip>
                )}
                {isMasterVersion && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="shrink-0">
                        <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" aria-label="Мастер-версия" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Мастер-версия</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            
            {prompt && (
              <p className="text-sm text-gray-400 leading-snug line-clamp-2">
                {prompt}
              </p>
            )}
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <TrackStatusBadge 
            status={status as TrackStatus}
            variant="compact"
            showIcon={true}
          />
        </div>
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

      <div className="flex items-center justify-between text-sm text-gray-400 mt-auto pt-2 border-t border-white/10">
        <div className="flex items-center gap-3">
          {formattedDuration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formattedDuration}</span>
            </div>
          )}
          
          {/* ✅ FIX: Отображение лайков */}
          {likeCount !== null && likeCount !== undefined && likeCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4" />
              <span>{likeCount}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

TrackCardInfo.displayName = 'TrackCardInfo';
