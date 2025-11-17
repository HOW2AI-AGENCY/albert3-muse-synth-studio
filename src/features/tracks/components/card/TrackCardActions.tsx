import React from 'react';
import { UnifiedTrackActionsMenu } from '@/components/tracks/shared/TrackActionsMenu.unified';

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
    versionNumber?: number;
    isMasterVersion?: boolean;
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
  onUpscaleAudio?: (trackId: string) => void; // ✅ NEW
  onGenerateCover?: (trackId: string) => void; // ✅ NEW
}

export const TrackCardActions = React.memo(({
  trackId,
  trackStatus,
  trackMetadata,
  isPublic,
  hasVocals,
  isLiked,
  operationTargetId,
  operationTargetVersion,
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
  onUpscaleAudio,
  onGenerateCover,
}: TrackCardActionsProps) => {
  return (
    <UnifiedTrackActionsMenu
      trackId={trackId}
      trackStatus={trackStatus}
      trackMetadata={trackMetadata}
      currentVersionId={operationTargetId}
      versionNumber={operationTargetVersion?.versionNumber}
      isMasterVersion={operationTargetVersion?.isMasterVersion ?? false}
      variant="compact"
      showQuickActions={true}
      layout="flat"
      enableAITools={true}
      isPublic={isPublic ?? false}
      hasVocals={hasVocals ?? false}
      isLiked={isLiked}
      onLike={onLikeClick}
      onDownload={onDownloadClick}
      onShare={onShareClick}
      onTogglePublic={onTogglePublic}
      onDescribeTrack={onDescribeTrack}
      onSeparateStems={onSeparateStems}
      onExtend={onExtend}
      onCover={onCover}
      onAddVocal={onAddVocal}
      onCreatePersona={onCreatePersona}
      onUpscaleAudio={onUpscaleAudio}
      onGenerateCover={onGenerateCover}
    />
  );
});

TrackCardActions.displayName = 'TrackCardActions';
