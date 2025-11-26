/**
 * @file TrackContextMenu.tsx
 * @description Context menu для треков с полным набором действий
 */
import { memo } from 'react';
import { ResponsiveDropdownMenu } from '@/components/ui/responsive-dropdown-menu';
import {
  ResponsiveDropdownMenuItem,
  ResponsiveDropdownMenuSeparator,
  ResponsiveDropdownMenuSub,
  ResponsiveDropdownMenuSubContent,
  ResponsiveDropdownMenuSubTrigger,
} from '@/components/ui/responsive-dropdown-menu-items';
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
    <ResponsiveDropdownMenu trigger={children}>
        {/* Playback */}
        {onPlay && (
          <>
            <ResponsiveDropdownMenuItem onClick={onPlay}>
              <Play className="mr-2 h-4 w-4" />
              Воспроизвести
            </ResponsiveDropdownMenuItem>
            <ResponsiveDropdownMenuSeparator />
          </>
        )}

        {/* Actions */}
        {onLike && (
          <ResponsiveDropdownMenuItem onClick={onLike}>
            <Heart className={`mr-2 h-4 w-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
            {isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
          </ResponsiveDropdownMenuItem>
        )}

        {onDownload && (
          <ResponsiveDropdownMenuItem onClick={onDownload}>
            <Download className="mr-2 h-4 w-4" />
            Скачать
          </ResponsiveDropdownMenuItem>
        )}

        {onShare && (
          <ResponsiveDropdownMenuItem onClick={onShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Поделиться
          </ResponsiveDropdownMenuItem>
        )}

        {/* Generation Actions */}
        {onSwitchVersion && (
          <ResponsiveDropdownMenuItem onClick={onSwitchVersion}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Сменить версию
          </ResponsiveDropdownMenuItem>
        )}

        {enableAITools && (onExtend || onCover || onSeparateStems || onAddVocal || onUpscaleAudio || onGenerateCover) && (
          <>
            <ResponsiveDropdownMenuSeparator />
            <ResponsiveDropdownMenuSub>
              <ResponsiveDropdownMenuSubTrigger>
                <Sparkles className="mr-2 h-4 w-4" />
                AI Обработка
              </ResponsiveDropdownMenuSubTrigger>
              <ResponsiveDropdownMenuSubContent>
                {onExtend && track.provider === 'suno' && (
                  <ResponsiveDropdownMenuItem onClick={onExtend}>
                    <Music className="mr-2 h-4 w-4" />
                    Продлить трек
                  </ResponsiveDropdownMenuItem>
                )}

                {onCover && track.provider === 'suno' && (
                  <ResponsiveDropdownMenuItem onClick={onCover}>
                    <Copy className="mr-2 h-4 w-4" />
                    Создать кавер
                  </ResponsiveDropdownMenuItem>
                )}

                {onSeparateStems && (
                  <ResponsiveDropdownMenuItem onClick={onSeparateStems}>
                    <Music className="mr-2 h-4 w-4" />
                    Разделить на стемы
                  </ResponsiveDropdownMenuItem>
                )}

                {onAddVocal && !track.has_vocals && (
                  <ResponsiveDropdownMenuItem onClick={onAddVocal}>
                    <Mic2 className="mr-2 h-4 w-4" />
                    Добавить вокал
                  </ResponsiveDropdownMenuItem>
                )}

                {onUpscaleAudio && (
                  <ResponsiveDropdownMenuItem onClick={onUpscaleAudio}>
                    <Upload className="mr-2 h-4 w-4" />
                    Улучшить качество
                  </ResponsiveDropdownMenuItem>
                )}

                {onGenerateCover && (
                  <ResponsiveDropdownMenuItem onClick={onGenerateCover}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    Создать обложку
                  </ResponsiveDropdownMenuItem>
                )}
              </ResponsiveDropdownMenuSubContent>
            </ResponsiveDropdownMenuSub>
          </>
        )}

        {/* Analysis */}
        {(onDescribeTrack || onCreatePersona) && (
          <>
            <ResponsiveDropdownMenuSeparator />
            <ResponsiveDropdownMenuSub>
              <ResponsiveDropdownMenuSubTrigger>
                <Sparkles className="mr-2 h-4 w-4" />
                Анализ
              </ResponsiveDropdownMenuSubTrigger>
              <ResponsiveDropdownMenuSubContent>
                {onDescribeTrack && track.provider === 'mureka' && (
                  <ResponsiveDropdownMenuItem onClick={onDescribeTrack}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    AI описание
                  </ResponsiveDropdownMenuItem>
                )}

                {onCreatePersona && track.provider === 'suno' && (
                  <ResponsiveDropdownMenuItem onClick={onCreatePersona}>
                    <User className="mr-2 h-4 w-4" />
                    Создать персону
                  </ResponsiveDropdownMenuItem>
                )}
              </ResponsiveDropdownMenuSubContent>
            </ResponsiveDropdownMenuSub>
          </>
        )}

        {/* Settings */}
        {onTogglePublic && (
          <>
            <ResponsiveDropdownMenuSeparator />
            <ResponsiveDropdownMenuItem onClick={onTogglePublic}>
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
            </ResponsiveDropdownMenuItem>
          </>
        )}

        {/* Error Handling */}
        {onRetry && track.status === 'failed' && (
          <>
            <ResponsiveDropdownMenuSeparator />
            <ResponsiveDropdownMenuItem onClick={onRetry}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Повторить генерацию
            </ResponsiveDropdownMenuItem>
          </>
        )}

        {/* Delete */}
        {onDelete && (
          <>
            <ResponsiveDropdownMenuSeparator />
            <ResponsiveDropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </ResponsiveDropdownMenuItem>
          </>
        )}
    </ResponsiveDropdownMenu>
  );
});

TrackContextMenu.displayName = 'TrackContextMenu';
