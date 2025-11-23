import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  Download,
  Share2,
  MoreVertical,
  Globe,
  Split,
  Expand,
  Mic2,
  UserPlus,
  User,
  Sparkles,
  RefreshCw,
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface TrackActionsMenuProps {
  trackId: string;
  trackStatus: string;
  trackMetadata?: Record<string, any> | null;
  isPublic?: boolean;
  hasVocals?: boolean;
  isLiked?: boolean;
  operationTargetId?: string;

  // Actions (все опциональные для гибкости)
  onLikeClick?: () => void;
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onTogglePublic?: () => void;
  onDescribeTrack?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onSync?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;

  // Aliases для совместимости с TrackListItem
  onDownload?: () => void;
  onShare?: () => void;

  // Display variant
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export const TrackActionsMenu = memo(({
  trackId,
  trackStatus,
  trackMetadata,
  isPublic = false,
  hasVocals = false,
  isLiked = false,
  operationTargetId,
  onLikeClick,
  onDownloadClick,
  onShareClick,
  onTogglePublic,
  onDescribeTrack,
  onSeparateStems,
  onExtend,
  onCover,
  onAddVocal,
  onCreatePersona,
  onSync,
  onRetry,
  onDelete,
  onDownload, // alias
  onShare, // alias
  variant = 'full',
  className,
}: TrackActionsMenuProps) => {
  // Resolve aliases
  const finalOnDownloadClick = onDownloadClick || onDownload;
  const finalOnShareClick = onShareClick || onShare;
  const isMurekaTrack = trackMetadata?.provider === 'mureka';
  const isSunoTrack = !isMurekaTrack;

  // Suppress unused warnings (will be used in future refactor)
  void onDelete;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Always visible: Like button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onLikeClick}
            className={cn(
              'h-8 w-8',
              variant === 'minimal' && 'h-7 w-7'
            )}
          >
            <Heart className={cn(
              'w-4 h-4',
              isLiked && 'fill-red-500 text-red-500'
            )} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isLiked ? 'Убрать из избранного' : 'В избранное'}
        </TooltipContent>
      </Tooltip>

      {/* Conditional: Quick actions (compact/full only) */}
      {variant !== 'minimal' && trackStatus === 'completed' && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={finalOnDownloadClick}
                className="h-8 w-8"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Скачать MP3</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={finalOnShareClick}
                className="h-8 w-8"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Поделиться</TooltipContent>
          </Tooltip>
        </>
      )}

      {/* DropdownMenu with context-aware options - Always visible now */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8',
              variant === 'minimal' && 'h-7 w-7'
            )}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Mobile-only quick actions */}
          {variant === 'minimal' && (
            <>
              <DropdownMenuItem onClick={onDownloadClick}>
                <Download className="w-4 h-4 mr-2" />
                Скачать MP3
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShareClick}>
                <Share2 className="w-4 h-4 mr-2" />
                Поделиться
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Download MP3 (if not already visible) */}
          {variant !== 'minimal' && (
            <DropdownMenuItem onClick={onDownloadClick}>
              <Download className="w-4 h-4 mr-2" />
              Скачать MP3
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          {/* Sharing */}
          <DropdownMenuItem onClick={onTogglePublic}>
            <Globe className="w-4 h-4 mr-2" />
            {isPublic ? 'Скрыть' : 'Опубликовать'}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* AI Features (выделено) */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            AI Инструменты
          </div>

          {onDescribeTrack && (
            <DropdownMenuItem
              onClick={() => onDescribeTrack(trackId)}
              className="text-primary"
            >
              <Sparkles className="w-4 h-4 mr-2 text-primary" />
              AI Описание
            </DropdownMenuItem>
          )}

          {/* Processing */}
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Обработка
          </div>

          {onSeparateStems && (
            <DropdownMenuItem onClick={() => onSeparateStems(operationTargetId || trackId)}>
              <Split className="w-4 h-4 mr-2" />
              Разделить на стемы
            </DropdownMenuItem>
          )}

          {/* Suno-only features */}
          {isSunoTrack && (
            <>
              {onExtend && (
                <DropdownMenuItem onClick={() => onExtend(operationTargetId || trackId)}>
                  <Expand className="w-4 h-4 mr-2" />
                  Расширить трек
                </DropdownMenuItem>
              )}

              {onCover && (
                <DropdownMenuItem onClick={() => onCover(operationTargetId || trackId)}>
                  <Mic2 className="w-4 h-4 mr-2" />
                  Создать кавер
                </DropdownMenuItem>
              )}

              {!hasVocals && onAddVocal && (
                <DropdownMenuItem onClick={() => onAddVocal(operationTargetId || trackId)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Добавить вокал
                </DropdownMenuItem>
              )}

              {onCreatePersona && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCreatePersona(trackId)}
                    className="text-primary"
                  >
                    <User className="w-4 h-4 mr-2 text-primary" />
                    Создать персону
                  </DropdownMenuItem>
                </>
              )}
            </>
          )}

          {/* Mureka-specific hint */}
          {isMurekaTrack && (
            <>
              <DropdownMenuSeparator />
              variant="ghost"
              size="icon"
              onClick={() => onSync(trackId)}
              className={cn(
                'h-8 w-8',
                variant === 'minimal' && 'h-7 w-7'
              )}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
        </TooltipTrigger>
        <TooltipContent>Обновить статус</TooltipContent>
      </Tooltip>
      )}

      {trackStatus === 'failed' && onRetry && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onRetry(trackId)}
              className={cn(
                'h-8 w-8',
                variant === 'minimal' && 'h-7 w-7'
              )}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Повторить генерацию</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
});

TrackActionsMenu.displayName = 'TrackActionsMenu';
