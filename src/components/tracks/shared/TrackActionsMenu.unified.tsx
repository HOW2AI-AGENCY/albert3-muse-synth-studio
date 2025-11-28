/**
 * Unified TrackActionsMenu Component
 * Refactored to use hooks for logic separation.
 * @version 2.2.0
 * @created 2025-11-15
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveDropdownMenuSeparator } from '@/components/ui/ResponsiveDropdownMenuSeparator';
import { ResponsiveDropdownMenuLabel } from '@/components/ui/ResponsiveDropdownMenuLabel';
import { Badge } from '@/components/ui/badge';
import { Heart, Download, MoreVertical, FileAudio } from 'lucide-react';
import { ResponsiveDropdownMenu } from '@/components/ui/responsive-dropdown-menu';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
                  onClick={(e) => { e.stopPropagation(); onLike?.(); }}
                  className={cn('h-10 w-10', variant === 'minimal' && 'h-8 w-8')}
                  aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
                >
                  <Heart className={cn('w-5 h-5', isLiked && 'fill-red-500 text-red-500')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLiked ? 'Убрать из избранного' : 'В избранное'}</TooltipContent>
            </Tooltip>
          )}

          {variant !== 'minimal' && trackStatus === 'completed' && onDownload && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => { e.stopPropagation(); onDownload?.(); }}
                  className="h-10 w-10"
                  aria-label="Скачать MP3"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Скачать MP3</TooltipContent>
            </Tooltip>
          )}

          {/* Share button hidden - moved to context menu */}
        </>
      )}

      {menuItems.length > 0 && (
        <ResponsiveDropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'h-10 w-10 shrink-0',
                variant === 'minimal' && 'h-8 w-8',
                'md:relative md:opacity-100', // Всегда видна на desktop
                'opacity-100 relative' // Всегда видна на mobile
              )}
              aria-label="Track actions menu"
              aria-haspopup="menu"
            >
              <MoreVertical className="w-5 h-5" />
            </Button>
          }
        >
          <>
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
                <ResponsiveDropdownMenuSeparator />
              </>
            )}

            {groupedItems.map((group, groupIdx) => (
              <div key={groupIdx}>
                {groupIdx > 0 && <ResponsiveDropdownMenuSeparator />}
                {group.label && (
                  <ResponsiveDropdownMenuLabel>
                    {group.label}
                  </ResponsiveDropdownMenuLabel>
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
          </>
        </ResponsiveDropdownMenu>
      )}
    </div>
  );
});

UnifiedTrackActionsMenu.displayName = 'UnifiedTrackActionsMenu';
