/**
 * TrackActionsMenu Component
 *
 * Comprehensive context menu for track operations
 * Provides 13 standard actions with Pro features and permissions
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useMemo, useCallback } from 'react';
import {
  Wand2,
  Sparkles,
  ListPlus,
  ListMusic,
  FolderInput,
  Send,
  Info,
  Shield,
  Share2,
  Download,
  Flag,
  Trash2,
  Lock,
  Waves,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import type {
  TrackActionsMenuProps,
  TrackActionsItem,
  TrackActionId,
} from '@/types/suno-ui.types';

// Icon map
const ICON_MAP: Record<string, typeof Wand2> = {
  Wand2,
  Sparkles,
  Waves,
  ListPlus,
  ListMusic,
  FolderInput,
  Send,
  Info,
  Shield,
  Share2,
  Download,
  Flag,
  Trash2,
};

// Default menu items (from types file)
const DEFAULT_ITEMS: TrackActionsItem[] = [
  { id: 'remix', icon: 'Wand2', label: 'Remix/Edit', shortcut: 'R' },
  { id: 'create', icon: 'Sparkles', label: 'Create' },
  { id: 'stems', icon: 'Waves', label: 'Get Stems', pro: true },
  { id: 'queue', icon: 'ListPlus', label: 'Add to Queue', shortcut: 'Q' },
  { id: 'playlist', icon: 'ListMusic', label: 'Add to Playlist' },
  { id: 'move', icon: 'FolderInput', label: 'Move to Workspace' },
  { id: 'publish', icon: 'Send', label: 'Publish' },
  { id: 'details', icon: 'Info', label: 'Song Details' },
  { id: 'permissions', icon: 'Shield', label: 'Visibility & Permissions' },
  { id: 'share', icon: 'Share2', label: 'Share', shortcut: 'S' },
  { id: 'download', icon: 'Download', label: 'Download', shortcut: 'D' },
  { id: 'report', icon: 'Flag', label: 'Report', danger: true },
  { id: 'trash', icon: 'Trash2', label: 'Move to Trash', danger: true },
];

interface TrackActionsMenuExtendedProps extends TrackActionsMenuProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const TrackActionsMenu = memo<TrackActionsMenuExtendedProps>(({
  trackId,
  items = DEFAULT_ITEMS,
  onAction,
  canPublish = true,
  canDelete = true,
  canMove = true,
  hasPro = false,
  trigger,
  open,
  onOpenChange,
}) => {
  // Filter items based on permissions
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Filter based on permissions
      if (item.id === 'publish' && !canPublish) return false;
      if (item.id === 'trash' && !canDelete) return false;
      if (item.id === 'move' && !canMove) return false;
      return true;
    });
  }, [items, canPublish, canDelete, canMove]);

  // Group items by category
  const itemGroups = useMemo(() => {
    const groups: { label?: string; items: TrackActionsItem[] }[] = [];

    // Creative actions
    const creativeItems = filteredItems.filter(
      (item) => item.id === 'remix' || item.id === 'create' || item.id === 'stems'
    );
    if (creativeItems.length > 0) {
      groups.push({ label: 'Creative', items: creativeItems });
    }

    // Organization actions
    const orgItems = filteredItems.filter(
      (item) =>
        item.id === 'queue' ||
        item.id === 'playlist' ||
        item.id === 'move'
    );
    if (orgItems.length > 0) {
      groups.push({ label: 'Organization', items: orgItems });
    }

    // Publishing actions
    const pubItems = filteredItems.filter(
      (item) =>
        item.id === 'publish' ||
        item.id === 'details' ||
        item.id === 'permissions'
    );
    if (pubItems.length > 0) {
      groups.push({ label: 'Publishing', items: pubItems });
    }

    // Sharing actions
    const shareItems = filteredItems.filter(
      (item) => item.id === 'share' || item.id === 'download'
    );
    if (shareItems.length > 0) {
      groups.push({ items: shareItems });
    }

    // Danger zone
    const dangerItems = filteredItems.filter(
      (item) => item.danger
    );
    if (dangerItems.length > 0) {
      groups.push({ label: 'Danger Zone', items: dangerItems });
    }

    return groups;
  }, [filteredItems]);

  const handleAction = useCallback((actionId: TrackActionId) => {
    try {
      onAction?.(actionId, trackId);
    } catch (error) {
      // Логируем, но не мешаем закрытию меню, чтобы избежать зацикливания UI
      logger.error('TrackActionsMenu action handler error', error as Error, 'TrackActionsMenu', {
        actionId,
        trackId,
      });
    } finally {
      onOpenChange?.(false);
    }
  }, [onAction, trackId, onOpenChange]);

  const renderMenuItem = (item: TrackActionsItem) => {
    const Icon = ICON_MAP[item.icon];
    const isDisabled = item.disabled || (item.pro && !hasPro);

    const menuItem = (
      <DropdownMenuItem
        key={item.id}
        disabled={isDisabled}
        onClick={(e) => {
          // Предотвращаем всплытие, чтобы клики по элементам меню
          // не влия ли на родительские обработчики и состояние
          e.stopPropagation();
          if (!isDisabled) {
            handleAction(item.id);
          }
        }}
        className={cn(
          'flex items-center gap-2 cursor-pointer',
          item.danger && 'text-destructive focus:text-destructive focus:bg-destructive/10',
          isDisabled && 'opacity-50'
        )}
      >
        {Icon && <Icon className="w-4 h-4" />}
        <span className="flex-1">{item.label}</span>

        {/* Pro Badge */}
        {item.pro && !hasPro && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-1">
            <Lock className="w-2.5 h-2.5" />
            Pro
          </Badge>
        )}

        {/* Keyboard Shortcut */}
        {item.shortcut && !item.pro && (
          <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center justify-center rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
            {item.shortcut}
          </kbd>
        )}
      </DropdownMenuItem>
    );

    // Wrap with tooltip if Pro feature and user doesn't have Pro
    if (item.pro && !hasPro) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{menuItem}</TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              {item.tooltip || 'Upgrade to Pro to unlock this feature'}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Wrap with tooltip if has custom tooltip
    if (item.tooltip && !item.pro) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{menuItem}</TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">{item.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuItem;
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {trigger && <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>}
      <DropdownMenuContent
        align="end"
        className="w-56"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {itemGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            {groupIdx > 0 && <DropdownMenuSeparator />}
            {group.label && (
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {group.label}
              </DropdownMenuLabel>
            )}
            {group.items.map(renderMenuItem)}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

TrackActionsMenu.displayName = 'TrackActionsMenu';
