/**
 * @file TrackContextMenu.tsx
 * @description Context menu для треков с полным набором действий
 */
import { memo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  Play,
  Heart,
  Download,
  Share2,
  Trash2,
  Music,
  Mic2,
  Sparkles,
  Copy,
  Globe,
  GlobeLock,
  RefreshCw,
  ImagePlus,
  Upload,
  User,
} from 'lucide-react';
import type { Track } from '@/types/domain/track.types';

interface TrackContextMenuProps {
  track: Track;
  children: React.ReactNode;
  onPlay?: () => void;
  onLike?: () => void;
  onDownload?: () => void | Promise<void>;
  onShare?: () => void;
  onDelete?: () => void;
  onExtend?: () => void;
  onCover?: () => void;
  onSeparateStems?: () => void;
  onAddVocal?: () => void;
  onDescribeTrack?: () => void;
  onCreatePersona?: () => void;
  onUpscaleAudio?: () => void;
  onGenerateCover?: () => void;
  onTogglePublic?: () => void;
  onRetry?: () => void;
  isLiked?: boolean;
  enableAITools?: boolean;
  onSwitchVersion?: () => void;
}

export const TrackContextMenu = memo(({
  track,
  children,
  onPlay,
  onLike,
  onDownload,
  onShare,
  onDelete,
  onExtend,
  onCover,
  onSeparateStems,
  onAddVocal,
  onDescribeTrack,
  onCreatePersona,
  onUpscaleAudio,
  onGenerateCover,
  onTogglePublic,
  onRetry,
  isLiked,
  enableAITools,
  onSwitchVersion,
}: TrackContextMenuProps) => {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {/* Playback */}
        {onPlay && (
          <>
            <ContextMenuItem onClick={onPlay}>
              <Play className="mr-2 h-4 w-4" />
              Воспроизвести
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}

        {/* Actions */}
        {onLike && (
          <ContextMenuItem onClick={onLike}>
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
            {isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
          </ContextMenuItem>
        )}

        {onDownload && (
          <ContextMenuItem onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Скачать
          </ContextMenuItem>
        )}

        {onShare && (
          <ContextMenuItem onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Поделиться
          </ContextMenuItem>
        )}

        {/* Generation Actions */}
        {onSwitchVersion && (
          <ContextMenuItem onClick={onSwitchVersion}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Сменить версию
          </ContextMenuItem>
        )}

        {enableAITools && (onExtend || onCover || onSeparateStems || onAddVocal || onUpscaleAudio || onGenerateCover) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Обработка
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {onExtend && track.provider === 'suno' && (
                  <ContextMenuItem onClick={onExtend}>
                    <Music className="mr-2 h-4 w-4" />
                    Продлить трек
                  </ContextMenuItem>
                )}

                {onCover && track.provider === 'suno' && (
                  <ContextMenuItem onClick={onCover}>
                    <Copy className="mr-2 h-4 w-4" />
                    Создать кавер
                  </ContextMenuItem>
                )}

                {onSeparateStems && (
                  <ContextMenuItem onClick={onSeparateStems}>
                    <Music className="mr-2 h-4 w-4" />
                    Разделить на стемы
                  </ContextMenuItem>
                )}

                {onAddVocal && !track.has_vocals && (
                  <ContextMenuItem onClick={onAddVocal}>
                    <Mic2 className="mr-2 h-4 w-4" />
                    Добавить вокал
                  </ContextMenuItem>
                )}

                {onUpscaleAudio && (
                  <ContextMenuItem onClick={onUpscaleAudio}>
                    <Upload className="mr-2 h-4 w-4" />
                    Улучшить качество
                  </ContextMenuItem>
                )}

                {onGenerateCover && (
                  <ContextMenuItem onClick={onGenerateCover}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Создать обложку
                  </ContextMenuItem>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Analysis */}
        {(onDescribeTrack || onCreatePersona) && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Sparkles className="mr-2 h-4 w-4" />
                Анализ
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {onDescribeTrack && track.provider === 'mureka' && (
                  <ContextMenuItem onClick={onDescribeTrack}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI описание
                  </ContextMenuItem>
                )}

                {onCreatePersona && track.provider === 'suno' && (
                  <ContextMenuItem onClick={onCreatePersona}>
                    <User className="mr-2 h-4 w-4" />
                    Создать персону
                  </ContextMenuItem>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}

        {/* Settings */}
        {onTogglePublic && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onTogglePublic}>
              {track.is_public ? (
                <>
                  <GlobeLock className="mr-2 h-4 w-4" />
                  Сделать приватным
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Опубликовать
                </>
              )}
            </ContextMenuItem>
          </>
        )}

        {/* Error Handling */}
        {onRetry && track.status === 'failed' && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Повторить генерацию
            </ContextMenuItem>
          </>
        )}

        {/* Delete */}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

TrackContextMenu.displayName = 'TrackContextMenu';
