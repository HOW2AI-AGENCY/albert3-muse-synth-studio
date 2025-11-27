import React, { useRef, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TrackListItem } from '@/design-system/components/compositions/TrackListItem/TrackListItem';

/**
 * Props for VirtualizedTrackList
 * All callback functions accept trackId as a parameter
 */
interface VirtualizedTrackListProps {
  tracks: any[];
  height?: number;
  onTrackPlay?: (track: any) => void;
  loadingTrackId?: string | null;
  onShare?: (trackId: string) => void | Promise<void>;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onUpscaleAudio?: (trackId: string) => void;
  onGenerateCover?: (trackId: string) => void;
  onRetry?: (trackId: string) => void | Promise<void>;
  onDelete?: (trackId: string) => void | Promise<void>;
  onSwitchVersion?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  enableAITools?: boolean;
}

const ITEM_HEIGHT = 72; // Height of TrackListItem in pixels

// Memoized Track List Item to prevent re-creation of callbacks
const VirtualizedTrackListItem = React.memo<{
  track: any;
  isLoading: boolean;
  handleTrackPlay: (track: any) => void;
  props: VirtualizedTrackListProps;
}>(({ track, isLoading, handleTrackPlay, props }) => {
  const onPlay = useCallback(() => handleTrackPlay(track), [handleTrackPlay, track]);

  const onShare = useCallback(() => props.onShare?.(track.id), [props.onShare, track.id]);
  const onSeparateStems = useCallback(() => props.onSeparateStems?.(track.id), [props.onSeparateStems, track.id]);
  const onExtend = useCallback(() => props.onExtend?.(track.id), [props.onExtend, track.id]);
  const onCover = useCallback(() => props.onCover?.(track.id), [props.onCover, track.id]);
  const onAddVocal = useCallback(() => props.onAddVocal?.(track.id), [props.onAddVocal, track.id]);
  const onCreatePersona = useCallback(() => props.onCreatePersona?.(track.id), [props.onCreatePersona, track.id]);
  const onUpscaleAudio = useCallback(() => props.onUpscaleAudio?.(track.id), [props.onUpscaleAudio, track.id]);
  const onGenerateCover = useCallback(() => props.onGenerateCover?.(track.id), [props.onGenerateCover, track.id]);
  const onRetry = useCallback(() => props.onRetry?.(track.id), [props.onRetry, track.id]);
  const onDelete = useCallback(() => props.onDelete?.(track.id), [props.onDelete, track.id]);
  const onSwitchVersion = useCallback(() => props.onSwitchVersion?.(track.id), [props.onSwitchVersion, track.id]);
  const onDescribeTrack = useCallback(() => props.onDescribeTrack?.(track.id), [props.onDescribeTrack, track.id]);

  const actionMenuProps = useMemo(() => ({
    onShare: props.onShare ? onShare : undefined,
    onSeparateStems: props.onSeparateStems ? onSeparateStems : undefined,
    onExtend: props.onExtend ? onExtend : undefined,
    onCover: props.onCover ? onCover : undefined,
    onAddVocal: props.onAddVocal ? onAddVocal : undefined,
    onCreatePersona: props.onCreatePersona ? onCreatePersona : undefined,
    onUpscaleAudio: props.onUpscaleAudio ? onUpscaleAudio : undefined,
    onGenerateCover: props.onGenerateCover ? onGenerateCover : undefined,
    onRetry: props.onRetry ? onRetry : undefined,
    onDelete: props.onDelete ? onDelete : undefined,
    onSwitchVersion: props.onSwitchVersion ? onSwitchVersion : undefined,
    onDescribeTrack: props.onDescribeTrack ? onDescribeTrack : undefined,
    enableAITools: props.enableAITools,
  }), [
    onShare, onSeparateStems, onExtend, onCover, onAddVocal,
    onCreatePersona, onUpscaleAudio, onGenerateCover, onRetry,
    onDelete, onSwitchVersion, onDescribeTrack, props.enableAITools
  ]);

  return (
    <div className="px-2 py-1 h-full relative">
      <TrackListItem
        track={track}
        onPlay={onPlay}
        actionMenuProps={actionMenuProps}
      />
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 rounded-xl bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-primary">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs font-medium">Загрузка версий…</span>
          </div>
        </div>
      )}
    </div>
  );
});
VirtualizedTrackListItem.displayName = 'VirtualizedTrackListItem';

/**
 * Virtualized track list component
 * Renders only visible items to optimize performance
 */
export const VirtualizedTrackList = React.memo<VirtualizedTrackListProps>((props) => {
  const {
    tracks,
    height,
    onTrackPlay,
    loadingTrackId,
  } = props;
  const parentRef = useRef<HTMLDivElement>(null);

  const handleTrackPlay = useCallback((track: any) => {
    if (onTrackPlay) {
      onTrackPlay(track);
    }
  }, [onTrackPlay]);

  const safeTracks = Array.isArray(tracks) ? tracks : [];
  const virtualizer = useVirtualizer({
    count: safeTracks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="w-full overflow-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
      style={{ height: height ? `${height}px` : '100%' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const track = safeTracks[virtualItem.index];
          if (!track) return null;

          const isLoading = loadingTrackId === track.id;

          return (
            <div
              key={virtualItem.key}
              className="absolute top-0 left-0 w-full"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <VirtualizedTrackListItem
                track={track}
                isLoading={isLoading}
                handleTrackPlay={handleTrackPlay}
                props={props}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedTrackList.displayName = 'VirtualizedTrackList';
