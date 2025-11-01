import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { fadeInUp } from '@/utils/animations';
import { withErrorBoundary } from '@/components/ErrorBoundary';
import { cn } from '@/lib/utils';
import { TrackCardCover } from './card/TrackCardCover';
import { TrackCardInfo } from './card/TrackCardInfo';
import { TrackCardActions } from './card/TrackCardActions';
import { GenerationProgress, FailedState } from './card/TrackCardStates';
import { useTrackCardState } from './card/useTrackCardState';

interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  style_tags?: string[];
  like_count?: number;
  view_count?: number;
  prompt?: string;
  progress_percent?: number | null;
  metadata?: Record<string, any> | null;
  is_public?: boolean;
  has_vocals?: boolean;
}

interface TrackCardProps {
  track: Track;
  onShare?: () => void;
  onClick?: () => void;
  onRetry?: (trackId: string) => void;
  onSync?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onRecognizeTrack?: (trackId: string) => void;
  className?: string;
}

const gradients = [
  'from-purple-500/10 to-pink-500/10',
  'from-blue-500/10 to-cyan-500/10',
  'from-green-500/10 to-emerald-500/10',
  'from-orange-500/10 to-red-500/10',
];

const getGradientByTrackId = (trackId: string) => {
  const index = trackId.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const TrackCardComponent = ({
  track,
  onShare,
  onClick,
  onRetry,
  onSync,
  onDelete,
  onExtend,
  onCover,
  onSeparateStems,
  onAddVocal,
  onDescribeTrack,
  onRecognizeTrack,
  className,
}: TrackCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  const {
    isHovered,
    setIsHovered,
    isVisible,
    setIsVisible,
    hasStems,
    selectedVersionIndex,
    isLiked,
    versionCount,
    masterVersion,
    displayedVersion,
    operationTargetId,
    operationTargetVersion,
    isCurrentTrack,
    isPlaying,
    playButtonDisabled,
    handleVersionChange,
    handlePlayClick,
    handleLikeClick,
    handleDownloadClick,
    handleTogglePublic,
  } = useTrackCardState(track);

  useEffect(() => {
    const element = cardRef.current;
    if (element) {
      element.classList.add('animate-fade-in');
    }
    setIsVisible(true);
  }, [setIsVisible]);

  const gradient = getGradientByTrackId(track.id);

  const handleShareClick = () => {
    onShare?.();
  };

  return (
    <motion.div
      ref={cardRef}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      role="article"
      aria-label={`Трек ${track.title}`}
      tabIndex={0}
    >
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer transition-all duration-300',
          'border-border/50 bg-card hover:bg-muted/30 card-elevated',
          isVisible ? 'h-full flex flex-col opacity-100' : 'h-full flex flex-col opacity-0',
          isCurrentTrack && 'ring-2 ring-primary/80 shadow-glow-primary-strong',
          className
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900">
          {(track.status === 'processing' || track.status === 'pending') && (
            <GenerationProgress track={track} onSync={onSync} onDelete={onDelete} />
          )}
          {track.status === 'failed' && (
            <FailedState
              message={track.error_message}
              trackId={track.id}
              onRetry={onRetry}
              onDelete={onDelete}
            />
          )}

          <TrackCardCover
            coverUrl={displayedVersion.cover_url || track.cover_url}
            title={displayedVersion.title || track.title}
            gradient={gradient}
            hasVocals={track.has_vocals}
            hasReferenceAudio={!!track.metadata?.reference_audio_url}
            isCompleted={track.status === 'completed'}
            trackId={track.id}
            currentVersionIndex={selectedVersionIndex}
            onVersionChange={handleVersionChange}
            isHovered={isHovered}
            isCurrentTrack={isCurrentTrack}
            isPlaying={isPlaying}
            playButtonDisabled={playButtonDisabled}
            onPlayClick={handlePlayClick}
          />
        </div>

        <CardContent className="p-2 flex-1 flex flex-col">
          <TrackCardInfo
            title={displayedVersion.title || track.title}
            prompt={track.prompt}
            duration={displayedVersion.duration || track.duration}
            versionCount={versionCount}
            hasStems={hasStems}
            status={track.status}
            progressPercent={track.progress_percent}
            createdAt={track.created_at}
          />

          <TrackCardActions
            trackId={track.id}
            trackStatus={track.status}
            trackMetadata={track.metadata}
            isPublic={track.is_public}
            hasVocals={track.has_vocals}
            isLiked={isLiked}
            masterVersion={masterVersion}
            operationTargetId={operationTargetId}
            operationTargetVersion={operationTargetVersion}
            onLikeClick={handleLikeClick}
            onDownloadClick={handleDownloadClick}
            onShareClick={handleShareClick}
            onTogglePublic={handleTogglePublic}
            onDescribeTrack={onDescribeTrack}
            onRecognizeTrack={onRecognizeTrack}
            onSeparateStems={onSeparateStems}
            onExtend={onExtend}
            onCover={onCover}
            onAddVocal={onAddVocal}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
};

const MemoizedTrackCard = React.memo(TrackCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.status === nextProps.track.status &&
    prevProps.track.like_count === nextProps.track.like_count &&
    prevProps.track.is_public === nextProps.track.is_public &&
    prevProps.track.audio_url === nextProps.track.audio_url &&
    prevProps.track.cover_url === nextProps.track.cover_url &&
    prevProps.track.duration === nextProps.track.duration &&
    prevProps.track.metadata?.reference_audio_url === nextProps.track.metadata?.reference_audio_url &&
    prevProps.track.progress_percent === nextProps.track.progress_percent &&
    prevProps.onClick === nextProps.onClick
  );
});

const TrackCardWithErrorBoundary = withErrorBoundary(MemoizedTrackCard);
TrackCardWithErrorBoundary.displayName = 'TrackCard';
export { TrackCardWithErrorBoundary as TrackCard };

// Inject keyframes for fade-in animation once
if (typeof document !== 'undefined' && !document.getElementById('track-card-animation-style')) {
  const style = document.createElement('style');
  style.id = 'track-card-animation-style';
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.4s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}
