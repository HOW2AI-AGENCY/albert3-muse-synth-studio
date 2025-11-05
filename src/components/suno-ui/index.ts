/**
 * Suno-like UI Components Index
 *
 * Centralized exports for all modern music platform UI components
 *
 * @version 2.0.0
 * @created 2025-11-05
 * @updated 2025-11-05 (Phase 4-6)
 */

// Track Components
export { TrackRow } from '../tracks/TrackRow';
export { TrackActionsMenu } from '../tracks/TrackActionsMenu';
export { TrackInspector } from '../tracks/TrackInspector';

// Modal Dialogs
export { ShareDialog } from '../modals/ShareDialog';
export { PermissionsDialog } from '../modals/PermissionsDialog';
export { MoveToWorkspaceDialog } from '../modals/MoveToWorkspaceDialog';
export { AddToQueueDialog } from '../modals/AddToQueueDialog';
export { ShortcutsDialog } from '../modals/ShortcutsDialog';

// Feed/Home Components
export { PromoBanner } from '../feed/PromoBanner';
export { ContestSection } from '../feed/ContestSection';

// Workspace Components
export { WorkspaceShell } from '../workspace/WorkspaceShell';
export { StyleEditor } from '../generator/StyleEditor';

// Type Exports
export type {
  // Track Types
  TrackStatus,
  TrackVisibility,
  TrackStats,
  TrackFlags,
  TrackRef,
  UITrack,
  TrackRowProps,
  TrackActionId,
  TrackActionsItem,
  TrackActionsMenuProps,

  // Generation Types
  VocalGender,
  LyricsMode,
  MusicModel,
  AdvancedGenerationOptions,
  GenerateRequest,
  SimpleGenerationMode,
  SimpleGenerateRequest,

  // Player Types
  PlayerStatus,
  AudioPlayerState,
  AudioPlayerBarProps,

  // Modal Types
  ShareNetwork,
  ShareDialogProps,
  PermissionsDialogProps,
  MoveToWorkspaceDialogProps,
  AddToQueueDialogProps,
  WorkspaceOption,

  // Feed Types
  FeedTab,
  FeedSection,
  PromoBannerProps,
  ContestInfo,
  ContestSectionProps,

  // Layout Types
  WorkspaceShellProps,
  TrackInspectorProps,
  StyleEditorProps,

  // Utility Types
  VisualState,
  LoadingState,
  PaginationState,
  TrackListFilters,
  TrackSortBy,
  TrackSortOrder,
  TrackListSort,

  // Keyboard & Analytics
  KeyboardShortcut,
  KeyboardShortcutHandler,
  AnalyticsEvent,
  AnalyticsPayload,
} from '@/types/suno-ui.types';

// Default Constants
export { DEFAULT_TRACK_ACTIONS } from '@/types/suno-ui.types';
