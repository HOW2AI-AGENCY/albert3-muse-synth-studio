import type { ReactNode } from 'react';

export type TrackActionId =
  // Quick actions
  | 'like'
  | 'download'
  | 'downloadWav'
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
  | 'convertWav'

  // System actions
  | 'sync'
  | 'retry'
  | 'report'
  | 'trash';

export type MenuVariant = 'full' | 'compact' | 'minimal';
export type MenuLayout = 'flat' | 'categorized';

export interface UnifiedTrackActionsMenuProps {
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
  onDownloadWav?: (trackId: string) => void;
  onShare?: () => void;
  onTogglePublic?: () => void;

  // AI & Processing
  onDescribeTrack?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onConvertToWav?: (trackId: string) => void;

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

export interface MenuItem {
  id: TrackActionId;
  label: string;
  icon: ReactNode;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
  pro?: boolean;
  shortcut?: string;
  tooltip?: string;
  showInVariant?: MenuVariant[];
}
