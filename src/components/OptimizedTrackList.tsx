/**
 * OptimizedTrackList Component
 *
 * Displays tracks in a list view with full interactivity
 *
 * ✅ PERFORMANCE FIX #7 (v2.1.0):
 * - Добавлены недостающие обработчики событий
 * - Исправлена проблема с неработающим list view
 * - Мемоизированные обработчики для оптимизации
 *
 * @version 2.1.0
 */
import React, { useMemo, useCallback, memo } from 'react';
import { TrackListItem } from '@/design-system/components/compositions/TrackListItem/TrackListItem';
import { OptimizedTrack } from '@/types/track.types';

interface OptimizedTrackListProps {
  tracks: OptimizedTrack[];
  className?: string;
  // Event handlers
  onTrackPlay?: (track: any) => void;
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

export const OptimizedTrackList: React.FC<OptimizedTrackListProps> = memo(({
  tracks,
  className = '',
  onTrackPlay,
  onShare,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
  onCreatePersona,
  onUpscaleAudio,
  onGenerateCover,
  onRetry,
  onDelete,
  onSwitchVersion,
  onDescribeTrack,
  enableAITools = true,
}) => {
  const normalizeStatus = useCallback((status?: OptimizedTrack['status']): OptimizedTrack['status'] => {
    if (!status || status === 'pending') return 'pending';
    if (status === 'processing') return 'processing';
    if (status === 'failed') return 'failed';
    return 'completed';
  }, []);

  /**
   * ✅ PERFORMANCE FIX #7: Мемоизированные обработчики
   *
   * ПРОБЛЕМА (до исправления):
   * - TrackListItem не получал никаких обработчиков событий
   * - List view был полностью неинтерактивным
   * - Невозможно было воспроизвести трек или выполнить действия
   *
   * РЕШЕНИЕ:
   * - Добавлены все необходимые обработчики событий из пропсов
   * - Обработчики мемоизированы через useCallback
   * - Теперь list view работает так же как grid view
   */
  const handleTrackPlay = useCallback((track: any) => {
    if (onTrackPlay) {
      onTrackPlay(track);
    }
  }, [onTrackPlay]);

  const handleShare = useCallback((trackId: string) => {
    if (onShare) onShare(trackId);
  }, [onShare]);

  const handleSeparateStems = useCallback((trackId: string) => {
    if (onSeparateStems) onSeparateStems(trackId);
  }, [onSeparateStems]);

  const handleExtend = useCallback((trackId: string) => {
    if (onExtend) onExtend(trackId);
  }, [onExtend]);

  const handleCover = useCallback((trackId: string) => {
    if (onCover) onCover(trackId);
  }, [onCover]);

  const handleAddVocal = useCallback((trackId: string) => {
    if (onAddVocal) onAddVocal(trackId);
  }, [onAddVocal]);

  const handleCreatePersona = useCallback((trackId: string) => {
    if (onCreatePersona) onCreatePersona(trackId);
  }, [onCreatePersona]);

  const handleUpscaleAudio = useCallback((trackId: string) => {
    if (onUpscaleAudio) onUpscaleAudio(trackId);
  }, [onUpscaleAudio]);

  const handleGenerateCover = useCallback((trackId: string) => {
    if (onGenerateCover) onGenerateCover(trackId);
  }, [onGenerateCover]);

  const handleRetry = useCallback((trackId: string) => {
    if (onRetry) onRetry(trackId);
  }, [onRetry]);

  const handleDelete = useCallback((trackId: string) => {
    if (onDelete) onDelete(trackId);
  }, [onDelete]);

  const handleSwitchVersion = useCallback((trackId: string) => {
    if (onSwitchVersion) onSwitchVersion(trackId);
  }, [onSwitchVersion]);

  const handleDescribeTrack = useCallback((trackId: string) => {
    if (onDescribeTrack) onDescribeTrack(trackId);
  }, [onDescribeTrack]);

  return useMemo(() => (
    <div className={`space-y-2 ${className}`}>
      {tracks.map((track) => (
        <TrackListItem
          key={track.id}
          track={{
            ...track,
            status: normalizeStatus(track.status) as 'pending' | 'processing' | 'completed' | 'failed',
          } as any}
          onPlay={() => handleTrackPlay(track)}
          actionMenuProps={{
            onShare: onShare ? () => handleShare(track.id) : undefined,
            onSeparateStems: onSeparateStems ? () => handleSeparateStems(track.id) : undefined,
            onExtend: onExtend ? () => handleExtend(track.id) : undefined,
            onCover: onCover ? () => handleCover(track.id) : undefined,
            onAddVocal: onAddVocal ? () => handleAddVocal(track.id) : undefined,
            onCreatePersona: onCreatePersona ? () => handleCreatePersona(track.id) : undefined,
            onUpscaleAudio: onUpscaleAudio ? () => handleUpscaleAudio(track.id) : undefined,
            onGenerateCover: onGenerateCover ? () => handleGenerateCover(track.id) : undefined,
            onRetry: onRetry ? () => handleRetry(track.id) : undefined,
            onDelete: onDelete ? () => handleDelete(track.id) : undefined,
            onSwitchVersion: onSwitchVersion ? () => handleSwitchVersion(track.id) : undefined,
            onDescribeTrack: onDescribeTrack ? () => handleDescribeTrack(track.id) : undefined,
            enableAITools,
          }}
        />
      ))}
    </div>
  ), [
    tracks,
    className,
    normalizeStatus,
    handleTrackPlay,
    handleShare,
    handleSeparateStems,
    handleExtend,
    handleCover,
    handleAddVocal,
    handleCreatePersona,
    handleUpscaleAudio,
    handleGenerateCover,
    handleRetry,
    handleDelete,
    handleSwitchVersion,
    handleDescribeTrack,
    onShare,
    onSeparateStems,
    onExtend,
    onCover,
    onAddVocal,
    onCreatePersona,
    onUpscaleAudio,
    onGenerateCover,
    onRetry,
    onDelete,
    onSwitchVersion,
    onDescribeTrack,
    enableAITools,
  ]);
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;