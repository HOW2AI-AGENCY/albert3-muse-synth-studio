/**
 * TracksList — упрощенный компонент списка треков
 * Используется на странице Генерации.
 * Отображает треки в виде сетки с минимальным набором действий
 *
 * @version 3.2.0
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDeleteTrack } from '@/hooks/useDeleteTrack';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { TrackCard } from '@/features/tracks/components/TrackCard';
import { LazyTrackDeleteDialog } from '@/components/LazyDialogs';
import type { Track } from '@/types/track.types';

interface TracksListProps {
  tracks: Track[];
  viewMode?: 'grid' | 'list';
  onRefresh?: () => void;
  isLoading?: boolean;
}

/**
 * Основной компонент списка треков
 * Отображает треки в виде сетки
 */
const TracksListComponent = ({
  tracks,
  onRefresh,
}: TracksListProps) => {
  const { deleteTrack } = useDeleteTrack();
  const { toast } = useToast();

  const [dialogState, setDialogState] = useState<{
    delete?: { id: string; title: string };
  }>({});

  /**
   * Обработчик удаления трека
   * Открывает диалог подтверждения с названием трека
   */
  const handleDelete = useCallback((id: string, title: string) => {
    setDialogState((prev) => ({ ...prev, delete: { id, title } }));
  }, []);

  /**
   * Подтверждение удаления трека
   * Вызывает API и обновляет список
   */
  const confirmDelete = useCallback(async () => {
    if (!dialogState.delete) return;
    
    try {
      await deleteTrack(dialogState.delete.id);
      toast({
        title: '✅ Трек удален',
        description: `Трек "${dialogState.delete.title}" был успешно удален.`,
      });
      setDialogState((prev) => ({ ...prev, delete: undefined }));
      onRefresh?.();
    } catch (error) {
      logger.error('Track deletion failed', error as Error, 'TracksList', {
        trackId: dialogState.delete.id,
      });
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось удалить трек.',
        variant: 'destructive',
      });
    }
  }, [dialogState.delete, deleteTrack, onRefresh, toast]);

  /**
   * Рендер одного трека
   * Использует TrackCard с полным набором callbacks для контекстного меню
   */
  const renderTrackItem = useCallback(
    (track: Track) => {
      return (
        <TrackCard
          key={track.id}
          track={track as any}
          onDelete={(trackId: string) => {
            const t = tracks.find(t => t.id === trackId);
            if (t) handleDelete(trackId, t.title);
          }}
          onExtend={(trackId: string) => {
            console.log('Extend track:', trackId);
          }}
          onCover={(trackId: string) => {
            console.log('Create cover:', trackId);
          }}
          onSeparateStems={(trackId: string) => {
            console.log('Separate stems:', trackId);
          }}
          onAddVocal={(trackId: string) => {
            console.log('Add vocal:', trackId);
          }}
          onDescribeTrack={(trackId: string) => {
            console.log('Describe track:', trackId);
          }}
          onCreatePersona={(trackId: string) => {
            console.log('Create persona:', trackId);
          }}
          onRetry={(trackId: string) => {
            console.log('Retry track:', trackId);
          }}
        />
      );
    },
    [handleDelete, tracks]
  );

  return (
    <>
      <AnimatePresence>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {tracks.map(renderTrackItem)}
        </motion.div>
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <LazyTrackDeleteDialog
        open={!!dialogState.delete}
        onOpenChange={() =>
          setDialogState((prev) => ({ ...prev, delete: undefined }))
        }
        trackId={dialogState.delete?.id ?? ''}
        trackTitle={dialogState.delete?.title ?? ''}
        onConfirm={confirmDelete}
      />
    </>
  );
};

export const TracksList = TracksListComponent;
