/**
 * Unified TrackActionsMenu Component
 * Refactored to use hooks for logic separation.
 * @version 2.2.0
 * @created 2025-11-15
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Heart, Download, Share2, MoreVertical, FileAudio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTrackMenuItems } from './useTrackMenuItems';
import { useGroupedMenuItems } from './useGroupedMenuItems';
import { TrackActionMenuItem } from './TrackActionMenuItem';
import { VersionSwitcher } from './VersionSwitcher';
import type { UnifiedTrackActionsMenuProps } from './TrackActionsMenu.types';

export const UnifiedTrackActionsMenu = memo((props: UnifiedTrackActionsMenuProps) => {
  const {
    trackId,
    trackStatus,
    versionNumber,
    isMasterVersion = false,
    variant = 'full',
    showQuickActions = true,
    layout = 'flat',
    className,
    enableProFeatures = false,
    isLiked = false,
    onLike,
    onDownload,
    onShare,
  } = props;

  const menuItems = useTrackMenuItems(props);
  const groupedItems = useGroupedMenuItems(menuItems, layout, props.enableAITools ?? true);

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showQuickActions && (
        <>
          {onLike && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLike}
                  className={cn('h-8 w-8 touch-target-min', variant === 'minimal' && 'h-7 w-7')}
                  aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
                >
                  <Heart className={cn('w-4 h-4', isLiked && 'fill-red-500 text-red-500')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLiked ? 'Убрать из избранного' : 'В избранное'}</TooltipContent>
            </Tooltip>
          )}

          {variant !== 'minimal' && trackStatus === 'completed' && (
            <>
              {onDownload && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDownload}
                      className="h-8 w-8 touch-target-min"
                      aria-label="Скачать MP3"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Скачать MP3</TooltipContent>
                </Tooltip>
              )}

              {onShare && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onShare}
                      className="h-8 w-8 touch-target-min"
                      aria-label="Поделиться"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Поделиться</TooltipContent>
                </Tooltip>
              )}
            </>
          )}
        </>
      )}

      {menuItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8 touch-target-min shrink-0',
                variant === 'minimal' && 'h-7 w-7',
                'md:relative md:opacity-100', // Всегда видна на desktop
                'opacity-100 relative' // Всегда видна на mobile
              )}
              aria-label="Track actions menu"
              aria-haspopup="menu"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56"
            onCloseAutoFocus={(e) => e.preventDefault()}
          >
            {versionNumber && (
              <>
                <div className="px-2 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
                  <FileAudio className="w-3.5 h-3.5" />
                  Версия {versionNumber}
                  {isMasterVersion && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                      MASTER
                    </Badge>
                  )}
                </div>
                <VersionSwitcher
                  trackId={trackId}
                  currentVersionId={props.currentVersionId}
                  onVersionChange={props.onVersionChange}
                />
                <DropdownMenuSeparator />
              </>
            )}

            {groupedItems.map((group, groupIdx) => (
              <div key={groupIdx}>
                {groupIdx > 0 && <DropdownMenuSeparator />}
                {group.label && (
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {group.label}
                  </DropdownMenuLabel>
                )}
                {group.items.map((item) => (
                  <TrackActionMenuItem
                    key={item.id}
                    item={item}
                    trackId={trackId}
                    enableProFeatures={enableProFeatures}
                  />
                ))}
              </div>
            ))}

            {props.trackMetadata?.provider === 'mureka' && trackStatus === 'completed' && (props.onExtend || props.onCover) && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  💡 Расширение/кавер доступны только для Suno
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});

UnifiedTrackActionsMenu.displayName = 'UnifiedTrackActionsMenu';
