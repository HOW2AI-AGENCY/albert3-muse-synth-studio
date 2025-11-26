/**
 * TracksList — компонент списка треков с адаптивной сеткой и виртуализацией.
 * Используется на странице Генерации.
 *
 * @version 3.0.0
 * @author Jules
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/auth/useAuth';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useDeleteTrack } from '@/hooks/useDeleteTrack';
import { useManualSyncTrack } from '@/hooks/useManualSyncTrack';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { useResponsiveGrid } from '@/hooks/useResponsiveGrid';
import { VirtualizedTrackGrid } from '@/components/tracks/VirtualizedTrackGrid';
import { cn } from '@/lib/utils';
import type { DisplayTrack } from '@/types/track.types';
import { TrackCard } from '@/features/tracks/components/TrackCard';
import { TrackListItem } from '@/design-system/components/compositions/TrackListItem/TrackListItem';
import {
  LazyTrackDeleteDialog,
  LazySeparateStemsDialog,
  LazyExtendTrackDialog,
  LazyCreateCoverDialog,
  LazyAddVocalDialog,
  LazyCreatePersonaDialog
} from '@/components/LazyDialogs';
import { useLibraryDialogs } from '@/hooks/useLibraryDialogs';
import { useTrackOperations } from '@/hooks/tracks/useTrackOperations';
import type { Track } from '@/types/track.types';

interface TracksListProps {
  tracks: Track[];
  viewMode?: 'grid' | 'list';
  onRefresh?: () => void;
  isLoading?: boolean;
}

const TracksListComponent = ({
  tracks,
  viewMode = 'grid',
  onRefresh,
}: TracksListProps) => {
  const { user } = useAuth();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayerStore();
  const { deleteTrack, isDeleting } = useDeleteTrack();
  const { syncTrack, isSyncing } = useManualSyncTrack();
  const { toast } = useToast();
  const dialogs = useLibraryDialogs();
  const {
    handleShare,
    handleRetry,
    handleSeparateStems,
    handleExtend,
    handleCover,
    handleAddVocal,
    handleCreatePersona,
    handleUpscaleAudio,
    handleGenerateCover,
    handleDescribeTrack,
    handleSwitchVersion,
  } = useTrackOperations({ tracks, refresh: onRefresh });

  const [dialogState, setDialogState] = useState<{
    delete?: { id: string; title: string };
  }>({});

  const handleDelete = useCallback((id: string, title: string) => {
    setDialogState((prev) => ({ ...prev, delete: { id, title } }));
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!dialogState.delete) return;
    try {
      await deleteTrack(dialogState.delete.id);
      toast({
        title: 'Трек удален',
        description: `Трек "${dialogState.delete.title}" был успешно удален.`,
      });
      setDialogState((prev) => ({ ...prev, delete: undefined }));
      onRefresh?.();
    } catch (error) {
      logger.error('Track deletion failed', error as Error, 'TracksList', {
        trackId: dialogState.delete.id,
      });
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить трек.',
        variant: 'destructive',
      });
    }
  }, [dialogState.delete, deleteTrack, onRefresh, toast]);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  // Container width tracking for responsive grid
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver(entries => {
        if (entries[0]) {
          setContainerWidth(entries[0].contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const { columns, gap, gridClass, gapClass } = useResponsiveGrid(containerWidth);
  const shouldVirtualize = memoizedTracks.length > 50 && viewMode === 'grid';


  const renderTrackItem = useCallback(
    (track: Track) => {
      const isCurrent = currentTrack?.id === track.id;

      if (viewMode === 'list') {
        return (
          <TrackListItem
            track={track}
            isPlaying={isCurrent && isPlaying}
            onPlay={() => playTrack(track as any, memoizedTracks as any)}
            actionMenuProps={{
                onShare: () => handleShare(track.id),
                onDelete: () => handleDelete(track.id, track.title),
                onSeparateStems: () => handleSeparateStems(track.id),
                onExtend: () => handleExtend(track.id),
                onCover: () => handleCover(track.id),
                onAddVocal: () => handleAddVocal(track.id),
                onCreatePersona: () => handleCreatePersona(track.id),
                onUpscaleAudio: () => handleUpscaleAudio(track.id),
                onGenerateCover: () => handleGenerateCover(track.id),
                onDescribeTrack: () => handleDescribeTrack(track.id),
                onSwitchVersion: () => handleSwitchVersion(track.id),
                onRetry: () => handleRetry(track.id),
                onSync: () => syncTrack(track.id),
            }}
          />
        );
      }

      return (
        <TrackCard
          track={track as any}
          isPlaying={isCurrent && isPlaying}
          onPlay={() => playTrack(track as any, memoizedTracks as any)}
          onShare={() => handleShare(track.id)}
          onDelete={() => handleDelete(track.id, track.title)}
          onSeparateStems={() => handleSeparateStems(track.id)}
          onExtend={() => handleExtend(track.id)}
          onCover={() => handleCover(track.id)}
          onAddVocal={() => handleAddVocal(track.id)}
          onCreatePersona={() => handleCreatePersona(track.id)}
          onUpscaleAudio={() => handleUpscaleAudio(track.id)}
          onGenerateCover={() => handleGenerateCover(track.id)}
          onDescribeTrack={() => handleDescribeTrack(track.id)}
          onSwitchVersion={() => handleSwitchVersion(track.id)}
          onRetry={() => handleRetry(track.id)}
          onSync={() => syncTrack(track.id)}
        />
      );
    },
    [
      viewMode,
      currentTrack,
      isPlaying,
      playTrack,
      memoizedTracks,
      handleShare,
      handleDelete,
      handleSeparateStems,
      handleExtend,
      handleCover,
      handleAddVocal,
      handleCreatePersona,
      handleUpscaleAudio,
      handleGenerateCover,
      handleDescribeTrack,
      handleSwitchVersion,
      handleRetry,
      syncTrack,
    ]
  );

  return (
    <>
      <AnimatePresence>
        <div ref={containerRef} className="w-full h-full">
          {shouldVirtualize ? (
             <VirtualizedTrackGrid
                tracks={memoizedTracks as DisplayTrack[]}
                columns={columns}
                gap={gap}
                onTrackPlay={(track) => playTrack(track as any, memoizedTracks as any)}
                onShare={handleShare}
                onSeparateStems={handleSeparateStems}
                onExtend={handleExtend}
                onCover={handleCover}
                onAddVocal={handleAddVocal}
                onCreatePersona={handleCreatePersona}
                onDescribeTrack={handleDescribeTrack}
                onRetry={(trackId) => handleRetry(trackId)}
                onDelete={(trackId) => handleDelete(trackId, tracks.find(t => t.id === trackId)?.title ?? '')}
              />
          ) : (
            <motion.div
              className={viewMode === 'grid' ? cn('grid', gridClass, gapClass) : 'space-y-2'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {memoizedTracks.map(renderTrackItem)}
            </motion.div>
          )}
        </div>
      </AnimatePresence>

      <LazyTrackDeleteDialog
        open={!!dialogState.delete}
        onOpenChange={() =>
          setDialogState((prev) => ({ ...prev, delete: undefined }))
        }
        trackId={dialogState.delete?.id ?? ''}
        trackTitle={dialogState.delete?.title ?? ''}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />

      {dialogs.separateStems.isOpen && dialogs.separateStems.data && (
        <LazySeparateStemsDialog
          open={dialogs.separateStems.isOpen}
          onOpenChange={dialogs.closeSeparateStems}
          trackId={dialogs.separateStems.data.id}
          trackTitle={dialogs.separateStems.data.title}
          onSuccess={() => {
            onRefresh?.();
            dialogs.closeSeparateStems();
          }}
        />
      )}

      {dialogs.extend.isOpen && dialogs.extend.data && (
        <LazyExtendTrackDialog
          open={dialogs.extend.isOpen}
          onOpenChange={dialogs.closeExtend}
          track={dialogs.extend.data as any}
        />
      )}

      {dialogs.cover.isOpen && dialogs.cover.data && (
        <LazyCreateCoverDialog
          open={dialogs.cover.isOpen}
          onOpenChange={dialogs.closeCover}
          track={dialogs.cover.data as any}
        />
      )}

      {dialogs.addVocal.isOpen && dialogs.addVocal.data && (
        <LazyAddVocalDialog
          open={dialogs.addVocal.isOpen}
          onOpenChange={dialogs.closeAddVocal}
          trackId={dialogs.addVocal.data}
          onSuccess={onRefresh}
        />
      )}

      {dialogs.createPersona.isOpen && dialogs.createPersona.data && (
        <LazyCreatePersonaDialog
          open={dialogs.createPersona.isOpen}
          onOpenChange={dialogs.closeCreatePersona}
          track={dialogs.createPersona.data as any}
          onSuccess={dialogs.closeCreatePersona}
        />
      )}
    </>
  );
};

export const TracksList = memo(TracksListComponent);
