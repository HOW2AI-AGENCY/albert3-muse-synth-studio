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
    onSwitchVersion,
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

  // COMMENT: Обработчик для принудительной синхронизации данных о треке.
  const handleSync = useCallback((trackId: string) => {
    resyncTrack({ trackId, force: false });
  }, [resyncTrack]);

  return useMemo<MenuItem[]>(() => {
    // COMMENT: Локальные переменные для упрощения условий и повышения читаемости.
    const isMurekaTrackLocal = trackMetadata?.provider === 'mureka';
    const isSunoTrackLocal = !isMurekaTrackLocal;
    const isCompletedLocal = trackStatus === 'completed';
    const isProcessingLocal = trackStatus === 'processing' || trackStatus === 'pending';
    const isFailedLocal = trackStatus === 'failed';
    const items: MenuItem[] = [];

    // COMMENT: Добавляем базовые действия (лайк, скачать), если они не отображаются как "быстрые действия".
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

    if (onSwitchVersion) {
      items.push({
        id: 'switchVersion',
        label: 'Сменить версию',
        icon: <RefreshCw className="w-4 h-4" />,
        action: onSwitchVersion,
      });
    }

    // COMMENT: Действие "Поделиться" всегда доступно для завершенных треков.
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

    // COMMENT: Группировка всех AI-функций под одним флагом `enableAITools` для чистоты и предсказуемости кода.
    // Этот блок будет добавлен только если AI-инструменты включены и трек успешно сгенерирован.
    if (enableAITools && isCompletedLocal) {

      // COMMENT: Разделение на стемы. Доступно для всех треков.
      if (onSeparateStems) {
        items.push({
          id: 'stems',
          label: 'Разделить на стемы',
          icon: <Split className="w-4 h-4" />,
          action: () => onSeparateStems(currentVersionId || trackId),
          disabled: false,
        });
      }

      // COMMENT: Конвертация в WAV. Показывает статус конвертации.
      const isConvertingWav = !!(trackMetadata && (trackMetadata as any).wavConverting);
      if (onConvertToWav) {
        items.push({
          id: 'convertWav',
          label: isConvertingWav ? 'Конвертация в WAV…' : 'Конвертировать в WAV',
          icon: <FileAudio className="w-4 h-4" />,
          action: () => onConvertToWav(currentVersionId || trackId),
          disabled: isConvertingWav,
        });
      }

      // COMMENT: Улучшение качества аудио до 48kHz.
      if (onUpscaleAudio) {
        items.push({
          id: 'upscale',
          label: 'Повысить качество (48kHz)',
          icon: <Sparkles className="w-4 h-4" />,
          action: () => onUpscaleAudio(currentVersionId || trackId),
        });
      }

      // COMMENT: Генерация обложки с помощью AI. Доступно только для треков Suno.
      if (onGenerateCover && isSunoTrackLocal) {
        items.push({
          id: 'generateCover',
          label: 'Создать обложку AI',
          icon: <Wand2 className="w-4 h-4" />,
          action: () => onGenerateCover(trackId),
        });
      }

      // COMMENT: Создание AI-описания для трека.
      if (onDescribeTrack) {
        items.push({
          id: 'describe',
          label: 'AI Описание',
          icon: <Sparkles className="w-4 h-4 text-primary" />,
          action: () => onDescribeTrack(trackId),
        });
      }

      // COMMENT: Функции, специфичные для провайдера Suno.
      if (isSunoTrackLocal) {
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

    // COMMENT: Добавляем опцию синхронизации для всех завершенных треков.
    if (isCompletedLocal) {
      items.push({
        id: 'resync',
        label: 'Синхронизировать данные',
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => handleSync(trackId),
      });
    }

    // COMMENT: Действия для треков в процессе обработки или с ошибкой.
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
        label: 'Move to Trash',
        icon: <Trash2 className="w-4 h-4" />,
        action: () => onDelete(trackId),
        danger: true,
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
    handleSync
  ]);
};
