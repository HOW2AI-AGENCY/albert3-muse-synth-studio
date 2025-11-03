import React from 'react';
import { TrackActionsMenu } from '@/features/tracks/components/shared/TrackActionsMenu';

interface Version {
  id: string;
  versionNumber: number;
  isMasterVersion: boolean;
}

interface TrackCardActionsProps {
  trackId: string;
  trackStatus: string;
  trackMetadata?: Record<string, any> | null;
  isPublic?: boolean | null;
  hasVocals?: boolean | null;
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
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
}

export const TrackCardActions = React.memo(({
  trackId,
  trackStatus,
  trackMetadata,
  isPublic,
  hasVocals,
  isLiked,
  operationTargetId,
  onLikeClick,
  onDownloadClick,
  onShareClick,
  onTogglePublic,
  onDescribeTrack,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
  onCreatePersona,
}: TrackCardActionsProps) => {
  return (
    <TrackActionsMenu
      trackId={trackId}
      trackStatus={trackStatus}
      trackMetadata={trackMetadata}
      isPublic={isPublic ?? false}
      hasVocals={hasVocals ?? false}
      isLiked={isLiked}
      operationTargetId={operationTargetId}
      onLikeClick={onLikeClick}
      onDownloadClick={onDownloadClick}
      onShareClick={onShareClick}
      onTogglePublic={onTogglePublic}
      onDescribeTrack={onDescribeTrack}
      onSeparateStems={onSeparateStems}
      onExtend={onExtend}
      onCover={onCover}
      onAddVocal={onAddVocal}
      onCreatePersona={onCreatePersona}
      variant="full"
    />
  );
});

TrackCardActions.displayName = 'TrackCardActions';
