/**
 * ✅ REFACTORED: Pure presentation component (v2.0.0)
 *
 * Separated UI from business logic
 * Uses centralized types from domain layer
 *
 * @version 2.0.0
 */
import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { fadeInUp } from '@/utils/animations';
import { withErrorBoundary } from '@/hoc/withErrorBoundary';
import { cn } from '@/lib/utils';
import { TrackCardCover } from '../components/card/TrackCardCover';
import { TrackCardInfo } from '../components/card/TrackCardInfo';
import { TrackCardActions } from '../components/card/TrackCardActions';
import { GenerationProgress, FailedState } from '../components/card/TrackCardStates';
import { useTrackCard, type TrackCardCallbacks } from '../hooks/useTrackCard';
import type { Track } from '@/types/domain/track.types';

interface TrackCardProps extends TrackCardCallbacks {
  track: Track;
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

/**
 * Pure presentation component - receives all logic from useTrackCard hook
 */
const TrackCardComponent = React.memo(({
  track,
  className,
  ...callbacks
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
    likeCount, // ✅ FIXED: Added missing likeCount from useTrackCard hook
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
    handleShareClick,
    handleCardClick,
    handleKeyDown,
  } = useTrackCard(track, callbacks);

  useEffect(() => {
    const element = cardRef.current;
    if (element) {
      element.classList.add('animate-fade-in');
    }
    setIsVisible(true);
  }, [setIsVisible]);

  const gradient = getGradientByTrackId(track.id);

  return (
    <motion.div
      ref={cardRef}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: 'var(--hover-lift-offset, -4px)' }}
      whileTap={{ scale: 'var(--tap-scale, 0.98)' }}
      role="article"
      aria-label={`Трек: ${track.title}. Статус: ${track.status === 'completed' ? 'завершён' : track.status === 'processing' ? 'в обработке' : track.status === 'failed' ? 'ошибка' : 'ожидание'}${track.duration ? `. Длительность: ${Math.floor(track.duration / 60)} минут ${track.duration % 60} секунд` : ''}`}
      aria-live={track.status === 'processing' || track.status === 'pending' ? 'polite' : undefined}
      aria-busy={track.status === 'processing' || track.status === 'pending'}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="touch-optimized focus-ring"
      data-testid="track-card"
    >
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer transition-all duration-300',
          'border-mv-hero-card-border bg-mv-surface-glass backdrop-blur-mv-md rounded-mv-card shadow-lg',
          'hover:bg-mv-surface-glass-hover hover:shadow-xl hover:border-purple-500/30',
          isVisible ? 'h-full flex flex-col opacity-100' : 'h-full flex flex-col opacity-0',
          isCurrentTrack && 'ring-2 ring-primary/80 shadow-glow-primary-strong',
          'w-full sm:min-w-[320px]',
          className
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900">
          {(track.status === 'processing' || track.status === 'pending') && (
            <GenerationProgress track={track} onSync={callbacks.onSync} onDelete={callbacks.onDelete} />
          )}
          {track.status === 'failed' && (
            <FailedState
              message={track.error_message}
              trackId={track.id}
              onRetry={callbacks.onRetry}
              onDelete={callbacks.onDelete}
            />
          )}

          <TrackCardCover
            coverUrl={(displayedVersion.cover_url || track.cover_url) ?? undefined}
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
            prompt={track.prompt ?? ''}
            duration={displayedVersion.duration || track.duration || undefined}
            versionCount={versionCount}
            selectedVersionIndex={selectedVersionIndex}
            hasStems={hasStems}
            status={track.status}
            progressPercent={track.progress_percent ?? undefined}
            createdAt={track.created_at}
            likeCount={likeCount} // ✅ FIXED: Use likeCount from hook, not track.like_count
            isMasterVersion={displayedVersion.isMasterVersion}
            onVersionChange={handleVersionChange}
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
            onDescribeTrack={callbacks.onDescribeTrack}
            onSeparateStems={callbacks.onSeparateStems}
            onExtend={callbacks.onExtend}
            onCover={callbacks.onCover}
            onAddVocal={callbacks.onAddVocal}
            onCreatePersona={callbacks.onCreatePersona}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
});

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
