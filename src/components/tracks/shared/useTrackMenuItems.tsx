import { useMemo, useCallback } from 'react';
import { useResyncTrack } from '@/hooks/useResyncTrack';
import {
  Heart,
  Download,
  Share2,
  Globe,
  Split,
  Expand,
  Mic2,
  UserPlus,
  User,
  Sparkles,
  RefreshCw,
  Wand2,
  ListPlus,
  ListMusic,
  FolderInput,
  Send,
  Info,
  Shield,
  Flag,
  Trash2,
  FileAudio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  MenuItem,
  UnifiedTrackActionsMenuProps
} from './TrackActionsMenu.types';

export const useTrackMenuItems = (props: UnifiedTrackActionsMenuProps): MenuItem[] => {
  const { mutate: resyncTrack } = useResyncTrack();

  const {
    trackId,
    trackStatus,
    trackMetadata,
    currentVersionId,
    showQuickActions = true,
    enableKeyboardShortcuts = false,
    enableAITools = true,
    enableProFeatures = false,
    canPublish = true,
    canDelete = true,
    canMove = true,
    isPublic = false,
    hasVocals = false,
    isLiked = false,
    onLike,
    onDownload,
    onDownloadWav,
    onShare,
    onTogglePublic,
    onDescribeTrack,
    onSeparateStems,
    onConvertToWav,
    onUpscaleAudio,
    onExtend,
    onCover,
    onGenerateCover,
    onAddVocal,
    onCreatePersona,
    onRemix,
    onCreate,
    onAddToQueue,
    onAddToPlaylist,
    onMoveToWorkspace,
    onPublish,
    onViewDetails,
    onSetPermissions,
    onSync,
    onRetry,
    onReport,
    onDelete,
  } = props;

  // ✅ Resync handler
  const handleSync = useCallback((trackId: string) => {
    resyncTrack({ trackId, force: false });
  }, [resyncTrack]);

  return useMemo<MenuItem[]>(() => {
    const isMurekaTrackLocal = trackMetadata?.provider === 'mureka';
    const isSunoTrackLocal = !isMurekaTrackLocal;
    const isCompletedLocal = trackStatus === 'completed';
    const isProcessingLocal = trackStatus === 'processing' || trackStatus === 'pending';
    const isFailedLocal = trackStatus === 'failed';
    const items: MenuItem[] = [];

    if (!showQuickActions) {
      if (onLike) {
        items.push({
          id: 'like',
          label: isLiked ? 'Убрать из избранного' : 'В избранное',
          icon: <Heart className={cn('w-4 h-4', isLiked && 'fill-red-500 text-red-500')} />,
          action: onLike,
          shortcut: enableKeyboardShortcuts ? 'L' : undefined,
        });
      }
      if (onDownload && isCompletedLocal) {
        items.push({
          id: 'download',
          label: 'Скачать MP3',
          icon: <Download className="w-4 h-4" />,
          action: onDownload,
          shortcut: enableKeyboardShortcuts ? 'D' : undefined,
        });
      }
      if (onDownloadWav && isCompletedLocal) {
        items.push({
          id: 'downloadWav',
          label: 'Скачать WAV',
          icon: <FileAudio className="w-4 h-4" />,
          action: () => onDownloadWav(currentVersionId || trackId),
          shortcut: enableKeyboardShortcuts ? 'W' : undefined,
        });
      }
    }

    // ✅ Always show Share in context menu for completed tracks
    if (onShare && isCompletedLocal) {
      items.push({
        id: 'share',
        label: 'Поделиться',
        icon: <Share2 className="w-4 h-4" />,
        action: onShare,
        shortcut: enableKeyboardShortcuts ? 'S' : undefined,
      });
    }

    if (onRemix && isCompletedLocal) {
      items.push({
        id: 'remix',
        label: 'Remix/Edit',
        icon: <Wand2 className="w-4 h-4" />,
        action: () => onRemix(trackId),
        shortcut: enableKeyboardShortcuts ? 'R' : undefined,
      });
    }

    if (onCreate && isCompletedLocal) {
      items.push({
        id: 'create',
        label: 'Create',
        icon: <Sparkles className="w-4 h-4" />,
        action: () => onCreate(trackId),
      });
    }

    if (onSeparateStems && isCompletedLocal) {
      items.push({
        id: 'stems',
        label: 'Разделить на стемы',
        icon: <Split className="w-4 h-4" />,
        action: () => onSeparateStems(currentVersionId || trackId),
        disabled: false,
      });
    }

    const isConvertingWav = !!(trackMetadata && (trackMetadata as any).wavConverting);
    if (onConvertToWav && isCompletedLocal) {
      items.push({
        id: 'convertWav',
        label: isConvertingWav ? 'Конвертация в WAV…' : 'Конвертировать в WAV',
        icon: <FileAudio className="w-4 h-4" />,
        action: () => onConvertToWav(currentVersionId || trackId),
        disabled: isConvertingWav,
      });
    }

    // ✅ NEW: Audio Upscaling
    if (onUpscaleAudio && isCompletedLocal && enableAITools) {
      items.push({
        id: 'upscale',
        label: 'Повысить качество (48kHz)',
        icon: <Sparkles className="w-4 h-4" />,
        action: () => onUpscaleAudio(currentVersionId || trackId),
      });
    }

    // ✅ NEW: Generate Cover Image
    if (onGenerateCover && isCompletedLocal && isSunoTrackLocal && enableAITools) {
      items.push({
        id: 'generateCover',
        label: 'Создать обложку AI',
        icon: <Wand2 className="w-4 h-4" />,
        action: () => onGenerateCover(trackId),
      });
    }

    if (onAddToQueue && isCompletedLocal) {
      items.push({
        id: 'queue',
        label: 'Add to Queue',
        icon: <ListPlus className="w-4 h-4" />,
        action: () => onAddToQueue(trackId),
        shortcut: enableKeyboardShortcuts ? 'Q' : undefined,
      });
    }

    if (onAddToPlaylist && isCompletedLocal) {
      items.push({
        id: 'playlist',
        label: 'Add to Playlist',
        icon: <ListMusic className="w-4 h-4" />,
        action: () => onAddToPlaylist(trackId),
      });
    }

    if (onMoveToWorkspace && canMove && isCompletedLocal) {
      items.push({
        id: 'move',
        label: 'Move to Workspace',
        icon: <FolderInput className="w-4 h-4" />,
        action: () => onMoveToWorkspace(trackId),
      });
    }

    if (onTogglePublic && isCompletedLocal) {
      items.push({
        id: 'publish',
        label: isPublic ? 'Скрыть' : 'Опубликовать',
        icon: <Globe className="w-4 h-4" />,
        action: onTogglePublic,
      });
    }

    if (onPublish && canPublish && isCompletedLocal) {
      items.push({
        id: 'publish',
        label: 'Publish',
        icon: <Send className="w-4 h-4" />,
        action: () => onPublish(trackId),
      });
    }

    if (onViewDetails && isCompletedLocal) {
      items.push({
        id: 'details',
        label: 'Song Details',
        icon: <Info className="w-4 h-4" />,
        action: () => onViewDetails(trackId),
      });
    }

    if (onSetPermissions && isCompletedLocal) {
      items.push({
        id: 'permissions',
        label: 'Visibility & Permissions',
        icon: <Shield className="w-4 h-4" />,
        action: () => onSetPermissions(trackId),
      });
    }

    if (enableAITools && onDescribeTrack && isCompletedLocal) {
      items.push({
        id: 'describe',
        label: 'AI Описание',
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        action: () => onDescribeTrack(trackId),
      });
    }

    if (isSunoTrackLocal && isCompletedLocal) {
      if (onExtend) {
        items.push({
          id: 'extend',
          label: 'Расширить трек',
          icon: <Expand className="w-4 h-4" />,
          action: () => onExtend(currentVersionId || trackId),
        });
      }

      if (onCover) {
        items.push({
          id: 'cover',
          label: 'Создать кавер',
          icon: <Mic2 className="w-4 h-4" />,
          action: () => onCover(currentVersionId || trackId),
        });
      }

      if (!hasVocals && onAddVocal) {
        items.push({
          id: 'addVocal',
          label: 'Добавить вокал',
          icon: <UserPlus className="w-4 h-4" />,
          action: () => onAddVocal(currentVersionId || trackId),
        });
      }

      if (onCreatePersona) {
        items.push({
          id: 'createPersona',
          label: 'Создать персону',
          icon: <User className="w-4 h-4 text-primary" />,
          action: () => onCreatePersona(trackId),
        });
      }
    }

    // Processing actions
    if (onConvertToWav && isCompletedLocal && isSunoTrackLocal) {
      items.push({
        id: 'convertWav',
        label: 'Конвертировать в WAV',
        icon: <FileAudio className="w-4 h-4" />,
        action: () => onConvertToWav(trackId),
      });
    }

    if (onUpscaleAudio && isCompletedLocal) {
      items.push({
        id: 'upscale',
        label: 'Улучшить качество аудио',
        icon: <Sparkles className="w-4 h-4" />,
        action: () => onUpscaleAudio(trackId),
      });
    }

    // ✅ Add resync option for all completed tracks
    if (isCompletedLocal) {
      items.push({
        id: 'resync',
        label: 'Синхронизировать данные',
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => handleSync(trackId),
      });
    }

    if (onSync && isProcessingLocal) {
      items.push({
        id: 'sync',
        label: 'Обновить статус',
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => onSync(trackId),
      });
    }

    if (onRetry && isFailedLocal) {
      items.push({
        id: 'retry',
        label: 'Повторить генерацию',
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => onRetry(trackId),
      });
    }

    if (onReport) {
      items.push({
        id: 'report',
        label: 'Report',
        icon: <Flag className="w-4 h-4" />,
        action: () => onReport(trackId),
        danger: true,
      });
    }

    if (onDelete && canDelete) {
      items.push({
        id: 'trash',
        label: 'Удалить трек',
        icon: <Trash2 className="w-4 h-4" />,
        action: () => onDelete(trackId),
        danger: true,
        confirmation: {
          title: 'Вы уверены, что хотите удалить этот трек?',
          description: 'Это действие нельзя будет отменить. Все связанные данные, включая версии и стемы, будут удалены безвозвратно.',
          confirmText: 'Удалить',
          cancelText: 'Отмена',
        }
      });
    }

    return items;
  }, [
    trackId,
    trackStatus,
    trackMetadata,
    showQuickActions,
    enableKeyboardShortcuts,
    enableAITools,
    enableProFeatures,
    canPublish,
    canDelete,
    canMove,
    isPublic,
    hasVocals,
    isLiked,
    currentVersionId,
    onLike,
    onDownload,
    onDownloadWav,
    onShare,
    onTogglePublic,
    onDescribeTrack,
    onSeparateStems,
    onConvertToWav,
    onExtend,
    onCover,
    onAddVocal,
    onCreatePersona,
    onRemix,
    onCreate,
    onAddToQueue,
    onAddToPlaylist,
    onMoveToWorkspace,
    onPublish,
    onViewDetails,
    onSetPermissions,
    onSync,
    onRetry,
    onReport,
    onDelete,
  ]);
};
