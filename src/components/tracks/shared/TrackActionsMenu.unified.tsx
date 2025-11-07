/**
 * Unified TrackActionsMenu Component
 *
 * Comprehensive context menu that combines functionality from both:
 * - /src/components/tracks/TrackActionsMenu.tsx (universal menu with groups)
 * - /src/features/tracks/components/shared/TrackActionsMenu.tsx (track-specific menu)
 *
 * Features:
 * - Version-aware actions
 * - Provider-aware (Suno/Mureka)
 * - Pro features with upgrade prompts
 * - Keyboard shortcuts
 * - Permission-based filtering
 * - Responsive variants (full, compact, minimal)
 * - Both flat and categorized layouts
 *
 * @version 2.0.0
 * @created 2025-11-07
 */

import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
  Wand2,
  ListPlus,
  ListMusic,
  FolderInput,
  Send,
  Info,
  Shield,
  Flag,
  Trash2,
  Lock,
  FileAudio,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

// ============================================================================
// Types
// ============================================================================

export type TrackActionId =
  // Quick actions
  | 'like'
  | 'download'
  | 'share'

  // Creative actions
  | 'remix'
  | 'create'
  | 'stems'

  // Organization
  | 'queue'
  | 'playlist'
  | 'move'

  // Publishing
  | 'publish'
  | 'details'
  | 'permissions'

  // Track-specific processing
  | 'describe'
  | 'extend'
  | 'cover'
  | 'addVocal'
  | 'createPersona'

  // System actions
  | 'sync'
  | 'retry'
  | 'report'
  | 'trash';

export type MenuVariant = 'full' | 'compact' | 'minimal';
export type MenuLayout = 'flat' | 'categorized';

interface UnifiedTrackActionsMenuProps {
  // Core track data
  trackId: string;
  trackStatus: string;
  trackMetadata?: Record<string, any> | null;

  // Version support
  currentVersionId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;

  // Display options
  variant?: MenuVariant;
  showQuickActions?: boolean; // Show Like, Download, Share as separate buttons
  layout?: MenuLayout; // 'flat' or 'categorized'
  className?: string;

  // Feature flags
  enableProFeatures?: boolean;
  enableKeyboardShortcuts?: boolean;
  enableAITools?: boolean;

  // Permissions
  canPublish?: boolean;
  canDelete?: boolean;
  canMove?: boolean;

  // State
  isPublic?: boolean;
  hasVocals?: boolean;
  isLiked?: boolean;

  // Actions (all optional for flexibility)
  onLike?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onTogglePublic?: () => void;

  // AI & Processing
  onDescribeTrack?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;

  // Suno-specific
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;

  // Universal actions
  onRemix?: (trackId: string) => void;
  onCreate?: (trackId: string) => void;
  onAddToQueue?: (trackId: string) => void;
  onAddToPlaylist?: (trackId: string) => void;
  onMoveToWorkspace?: (trackId: string) => void;
  onPublish?: (trackId: string) => void;
  onViewDetails?: (trackId: string) => void;
  onSetPermissions?: (trackId: string) => void;

  // System
  onSync?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
  onReport?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}

interface MenuItem {
  id: TrackActionId;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
  pro?: boolean;
  shortcut?: string;
  tooltip?: string;
  showInVariant?: MenuVariant[];
}

// ============================================================================
// Component
// ============================================================================

export const UnifiedTrackActionsMenu = memo(({
  trackId,
  trackStatus,
  trackMetadata,
  currentVersionId,
  versionNumber,
  isMasterVersion = false,

  variant = 'full',
  showQuickActions = true,
  layout = 'flat',
  className,

  enableProFeatures = false,
  enableKeyboardShortcuts = false,
  enableAITools = true,

  canPublish = true,
  canDelete = true,
  canMove = true,

  isPublic = false,
  hasVocals = false,
  isLiked = false,

  onLike,
  onDownload,
  onShare,
  onTogglePublic,
  onDescribeTrack,
  onSeparateStems,
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
}: UnifiedTrackActionsMenuProps) => {
  // Provider detection
  const isMurekaTrack = trackMetadata?.provider === 'mureka';
  const isSunoTrack = !isMurekaTrack;
  const isCompleted = trackStatus === 'completed';
  const isProcessing = trackStatus === 'processing' || trackStatus === 'pending';
  const isFailed = trackStatus === 'failed';

  // Build menu items based on available actions and permissions
  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    // Quick actions (if not shown as separate buttons)
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
      if (onDownload && isCompleted) {
        items.push({
          id: 'download',
          label: 'Скачать MP3',
          icon: <Download className="w-4 h-4" />,
          action: onDownload,
          shortcut: enableKeyboardShortcuts ? 'D' : undefined,
        });
      }
      if (onShare && isCompleted) {
        items.push({
          id: 'share',
          label: 'Поделиться',
          icon: <Share2 className="w-4 h-4" />,
          action: onShare,
          shortcut: enableKeyboardShortcuts ? 'S' : undefined,
        });
      }
    }

    // Creative actions
    if (onRemix && isCompleted) {
      items.push({
        id: 'remix',
        label: 'Remix/Edit',
        icon: <Wand2 className="w-4 h-4" />,
        action: () => onRemix(trackId),
        shortcut: enableKeyboardShortcuts ? 'R' : undefined,
      });
    }

    if (onCreate && isCompleted) {
      items.push({
        id: 'create',
        label: 'Create',
        icon: <Sparkles className="w-4 h-4" />,
        action: () => onCreate(trackId),
      });
    }

    if (onSeparateStems && isCompleted) {
      items.push({
        id: 'stems',
        label: 'Разделить на стемы',
        icon: <Split className="w-4 h-4" />,
        action: () => onSeparateStems(currentVersionId || trackId),
        pro: !enableProFeatures,
        tooltip: !enableProFeatures ? 'Upgrade to Pro to unlock this feature' : undefined,
      });
    }

    // Organization actions
    if (onAddToQueue && isCompleted) {
      items.push({
        id: 'queue',
        label: 'Add to Queue',
        icon: <ListPlus className="w-4 h-4" />,
        action: () => onAddToQueue(trackId),
        shortcut: enableKeyboardShortcuts ? 'Q' : undefined,
      });
    }

    if (onAddToPlaylist && isCompleted) {
      items.push({
        id: 'playlist',
        label: 'Add to Playlist',
        icon: <ListMusic className="w-4 h-4" />,
        action: () => onAddToPlaylist(trackId),
      });
    }

    if (onMoveToWorkspace && canMove && isCompleted) {
      items.push({
        id: 'move',
        label: 'Move to Workspace',
        icon: <FolderInput className="w-4 h-4" />,
        action: () => onMoveToWorkspace(trackId),
      });
    }

    // Publishing actions
    if (onTogglePublic && isCompleted) {
      items.push({
        id: 'publish',
        label: isPublic ? 'Скрыть' : 'Опубликовать',
        icon: <Globe className="w-4 h-4" />,
        action: onTogglePublic,
      });
    }

    if (onPublish && canPublish && isCompleted) {
      items.push({
        id: 'publish',
        label: 'Publish',
        icon: <Send className="w-4 h-4" />,
        action: () => onPublish(trackId),
      });
    }

    if (onViewDetails && isCompleted) {
      items.push({
        id: 'details',
        label: 'Song Details',
        icon: <Info className="w-4 h-4" />,
        action: () => onViewDetails(trackId),
      });
    }

    if (onSetPermissions && isCompleted) {
      items.push({
        id: 'permissions',
        label: 'Visibility & Permissions',
        icon: <Shield className="w-4 h-4" />,
        action: () => onSetPermissions(trackId),
      });
    }

    // AI Tools (if enabled)
    if (enableAITools && onDescribeTrack && isCompleted) {
      items.push({
        id: 'describe',
        label: 'AI Описание',
        icon: <Sparkles className="w-4 h-4 text-primary" />,
        action: () => onDescribeTrack(trackId),
      });
    }

    // Suno-specific actions
    if (isSunoTrack && isCompleted) {
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

    // System actions
    if (onSync && isProcessing) {
      items.push({
        id: 'sync',
        label: 'Обновить статус',
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => onSync(trackId),
      });
    }

    if (onRetry && isFailed) {
      items.push({
        id: 'retry',
        label: 'Повторить генерацию',
        icon: <RefreshCw className="w-4 h-4" />,
        action: () => onRetry(trackId),
      });
    }

    // Danger zone
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
    isCompleted,
    isProcessing,
    isFailed,
    isSunoTrack,
    isMurekaTrack,
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
    onShare,
    onTogglePublic,
    onDescribeTrack,
    onSeparateStems,
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

  // Group items by category for categorized layout
  const groupedItems = useMemo(() => {
    if (layout === 'flat') return [{ items: menuItems }];

    const groups: { label?: string; items: MenuItem[] }[] = [];

    // Creative
    const creativeItems = menuItems.filter(
      (item) => ['remix', 'create', 'stems'].includes(item.id)
    );
    if (creativeItems.length > 0) {
      groups.push({ label: 'Creative', items: creativeItems });
    }

    // Organization
    const orgItems = menuItems.filter(
      (item) => ['queue', 'playlist', 'move'].includes(item.id)
    );
    if (orgItems.length > 0) {
      groups.push({ label: 'Organization', items: orgItems });
    }

    // Publishing
    const pubItems = menuItems.filter(
      (item) => ['publish', 'details', 'permissions'].includes(item.id)
    );
    if (pubItems.length > 0) {
      groups.push({ label: 'Publishing', items: pubItems });
    }

    // AI Tools
    if (enableAITools) {
      const aiItems = menuItems.filter((item) => item.id === 'describe');
      if (aiItems.length > 0) {
        groups.push({ label: 'AI Инструменты', items: aiItems });
      }
    }

    // Processing (Stems, Extend, Cover, Add Vocal)
    const processingItems = menuItems.filter(
      (item) => ['stems', 'extend', 'cover', 'addVocal', 'createPersona'].includes(item.id)
    );
    if (processingItems.length > 0) {
      groups.push({ label: 'Обработка', items: processingItems });
    }

    // Sharing
    const shareItems = menuItems.filter(
      (item) => ['like', 'download', 'share'].includes(item.id)
    );
    if (shareItems.length > 0) {
      groups.push({ items: shareItems });
    }

    // System
    const systemItems = menuItems.filter(
      (item) => ['sync', 'retry'].includes(item.id)
    );
    if (systemItems.length > 0) {
      groups.push({ items: systemItems });
    }

    // Danger zone
    const dangerItems = menuItems.filter((item) => item.danger);
    if (dangerItems.length > 0) {
      groups.push({ label: 'Danger Zone', items: dangerItems });
    }

    return groups;
  }, [menuItems, layout, enableAITools]);

  // Render a single menu item
  const renderMenuItem = (item: MenuItem) => {
    const isDisabled = item.disabled || (item.pro && !enableProFeatures);

    const menuItemElement = (
      <DropdownMenuItem
        key={item.id}
        disabled={isDisabled}
        onClick={() => {
          if (!isDisabled) {
            try {
              item.action();
            } catch (error) {
              logger.error('Menu action failed', error as Error, 'TrackActionsMenu', {
                actionId: item.id,
                trackId,
              });
            }
          }
        }}
        className={cn(
          'flex items-center gap-2 cursor-pointer',
          item.danger && 'text-destructive focus:text-destructive focus:bg-destructive/10',
          isDisabled && 'opacity-50'
        )}
      >
        {item.icon}
        <span className="flex-1">{item.label}</span>

        {/* Pro Badge */}
        {item.pro && !enableProFeatures && (
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

    // Wrap with tooltip if needed
    if (item.tooltip || (item.pro && !enableProFeatures)) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>{menuItemElement}</TooltipTrigger>
          <TooltipContent side="left">
            <p className="text-xs">
              {item.tooltip || 'Upgrade to Pro to unlock this feature'}
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return menuItemElement;
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {/* Quick action buttons (always visible) */}
      {showQuickActions && (
        <>
          {onLike && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLike}
                  className={cn(
                    'h-8 w-8',
                    variant === 'minimal' && 'h-7 w-7'
                  )}
                  aria-label={isLiked ? 'Убрать из избранного' : 'В избранное'}
                >
                  <Heart
                    className={cn(
                      'w-4 h-4',
                      isLiked && 'fill-red-500 text-red-500'
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isLiked ? 'Убрать из избранного' : 'В избранное'}
              </TooltipContent>
            </Tooltip>
          )}

          {variant !== 'minimal' && isCompleted && (
            <>
              {onDownload && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDownload}
                      className="h-8 w-8"
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
                      className="h-8 w-8"
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

      {/* Dropdown menu with all actions */}
      {menuItems.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'h-8 w-8',
                variant === 'minimal' && 'h-7 w-7'
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
            {/* Version info (if applicable) */}
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
                <DropdownMenuSeparator />
              </>
            )}

            {/* Render grouped items */}
            {groupedItems.map((group, groupIdx) => (
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

            {/* Mureka hint */}
            {isMurekaTrack && isCompleted && (onExtend || onCover) && (
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
