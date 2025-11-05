/**
 * Suno-like UI Component Types
 *
 * Type definitions for the modern music platform UI components
 * Based on PRD v1.0 specifications
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import type { Track } from './domain/track.types';

// ============================================================================
// TRACK STATUS & STATES
// ============================================================================

export type TrackStatus =
  | 'draft'
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'published'
  | 'deleted';

export type TrackVisibility = 'private' | 'workspace' | 'public';

// ============================================================================
// TRACK DISPLAY MODELS
// ============================================================================

export interface TrackStats {
  likes: number;
  plays: number;
  comments: number;
}

export interface TrackFlags {
  liked: boolean;
  published: boolean;
  bookmarked?: boolean;
  inQueue?: boolean;
}

/**
 * Lightweight track reference for lists, queues, and player
 */
export interface TrackRef {
  id: string;
  title: string;
  thumbnailUrl: string;
  durationSec: number;
  artist?: string;
}

/**
 * Enhanced track model for UI display (Feed, Lists, Cards)
 * Extends base Track with UI-specific fields
 */
export interface UITrack extends Partial<Track> {
  id: string;
  title: string;
  durationSec: number;
  thumbnailUrl: string;
  badges: string[]; // e.g. ['v5', 'published', 'pro']
  meta: string; // Short style/mix description
  summary?: string; // Brief description for list view
  lyrics?: string;
  stats: TrackStats;
  flags: TrackFlags;
  status: TrackStatus;
  errorMessage?: string;
  visibility?: TrackVisibility;
}

// ============================================================================
// GENERATION TYPES
// ============================================================================

export type VocalGender = 'auto' | 'male' | 'female';
export type LyricsMode = 'auto' | 'manual';
export type MusicModel = 'v5' | 'v4.5' | 'v4' | 'v3.5';

export interface AdvancedGenerationOptions {
  vocalGender: VocalGender;
  lyricsMode: LyricsMode;
  weirdness: number; // 0..100
  styleInfluence: number; // 0..100
  audioWeight?: number; // 0..100 (for reference audio)
  lyricsWeight?: number; // 0..100 (for lyric adherence)
  exclude?: string;
}

export interface GenerateRequest {
  styles?: string;
  chips?: string[];
  options?: AdvancedGenerationOptions;
  lyrics?: string | null;
  title?: string;
  model?: MusicModel;
}

export type SimpleGenerationMode =
  | 'audio'
  | 'lyrics'
  | 'instrumental'
  | 'persona'
  | 'inspo';

export interface SimpleGenerateRequest {
  description: string;
  modes: SimpleGenerationMode[];
  inspiration?: string[];
  model?: MusicModel;
  title?: string;
}

// ============================================================================
// PLAYER TYPES
// ============================================================================

export type PlayerStatus = 'stopped' | 'playing' | 'paused' | 'buffering';

export interface AudioPlayerState {
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
  loop: boolean;
  shuffle: boolean;
  queue: TrackRef[];
  playlist?: TrackRef[];
  currentTrack?: TrackRef;
}

export interface AudioPlayerBarProps {
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
  loop: boolean;
  shuffle: boolean;
  queue: TrackRef[];
  playlist?: TrackRef[];
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (seconds: number) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onToggleLoop?: (loop: boolean) => void;
  onToggleShuffle?: (shuffle: boolean) => void;
  onChangeVolume?: (v: number) => void;
  onOpenQueue?: () => void;
}

// ============================================================================
// TRACK ROW COMPONENT (List View)
// ============================================================================

export interface TrackRowProps {
  track: UITrack;
  // Display options
  showMenu?: boolean;
  showStats?: boolean;
  showBadges?: boolean;
  // State flags
  isSelected?: boolean;
  isPlaying?: boolean;
  // Event handlers
  onPlay?: (id: string) => void;
  onPause?: (id: string) => void;
  onOpenInspector?: (id: string) => void;
  onPublish?: (id: string) => void;
  onLike?: (id: string) => void;
  onUnlike?: (id: string) => void;
  // Menu integration
  menu?: TrackActionsMenuProps;
  // Accessibility
  ariaLabel?: string;
  ariaSelected?: boolean;
}

// ============================================================================
// TRACK ACTIONS MENU
// ============================================================================

export type TrackActionId =
  | 'remix'
  | 'create'
  | 'stems'
  | 'queue'
  | 'playlist'
  | 'move'
  | 'publish'
  | 'details'
  | 'permissions'
  | 'share'
  | 'download'
  | 'report'
  | 'trash';

export interface TrackActionsItem {
  id: TrackActionId;
  icon: string; // Lucide icon name
  label: string;
  pro?: boolean; // Requires pro subscription
  danger?: boolean; // Destructive action
  disabled?: boolean;
  tooltip?: string;
  shortcut?: string; // e.g. "⌘K" or "Ctrl+K"
}

export interface TrackActionsMenuProps {
  trackId: string;
  items?: TrackActionsItem[]; // Optional custom items
  onAction?: (actionId: TrackActionId, trackId: string) => void;
  // Feature flags
  canPublish?: boolean;
  canDelete?: boolean;
  canMove?: boolean;
  hasPro?: boolean;
}

// Default menu items configuration
export const DEFAULT_TRACK_ACTIONS: TrackActionsItem[] = [
  { id: 'remix', icon: 'Wand2', label: 'Remix/Edit' },
  { id: 'create', icon: 'Sparkles', label: 'Create' },
  { id: 'stems', icon: 'Waveform', label: 'Get Stems', pro: true },
  { id: 'queue', icon: 'ListPlus', label: 'Add to Queue' },
  { id: 'playlist', icon: 'ListMusic', label: 'Add to Playlist' },
  { id: 'move', icon: 'FolderInput', label: 'Move to Workspace' },
  { id: 'publish', icon: 'Send', label: 'Publish' },
  { id: 'details', icon: 'Info', label: 'Song Details' },
  { id: 'permissions', icon: 'Shield', label: 'Visibility & Permissions' },
  { id: 'share', icon: 'Share2', label: 'Share' },
  { id: 'download', icon: 'Download', label: 'Download' },
  { id: 'report', icon: 'Flag', label: 'Report', danger: true },
  { id: 'trash', icon: 'Trash2', label: 'Move to Trash', danger: true },
];

// ============================================================================
// MODAL DIALOGS
// ============================================================================

export type ShareNetwork = 'twitter' | 'tiktok' | 'youtube' | 'vk' | 'facebook' | 'telegram';

export interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle?: string;
  link: string;
  embedCode?: string;
  networks?: ShareNetwork[];
  onCopyLink?: () => void;
  onShareNetwork?: (network: ShareNetwork) => void;
  onGenerateEmbed?: () => void;
}

export interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  currentVisibility: TrackVisibility;
  onSave: (visibility: TrackVisibility) => Promise<void>;
  canPublish?: boolean;
}

export interface MoveToWorkspaceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle?: string;
  workspaces: WorkspaceOption[];
  currentWorkspaceId?: string;
  onMove: (workspaceId: string) => Promise<void>;
}

export interface AddToQueueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle?: string;
  position?: 'next' | 'end';
  onAdd: (position: 'next' | 'end') => void;
}

export interface WorkspaceOption {
  id: string;
  name: string;
  trackCount?: number;
  icon?: string;
}

// ============================================================================
// SIMPLE CREATE PANEL
// ============================================================================

export interface SimpleCreatePanelProps {
  description: string;
  modes: SimpleGenerationMode[];
  inspiration: string[];
  model: MusicModel;
  credits: number;
  title?: string;
  isGenerating: boolean;
  onDescriptionChange: (value: string) => void;
  onModesChange: (modes: SimpleGenerationMode[]) => void;
  onInspirationChange: (tags: string[]) => void;
  onModelChange: (model: MusicModel) => void;
  onTitleChange?: (title: string) => void;
  onCreate: (payload: SimpleGenerateRequest) => void;
  onBoostPrompt?: () => void;
  isBoosting?: boolean;
}

// ============================================================================
// FEED / HOME PAGE
// ============================================================================

export type FeedTab = 'for-you' | 'following' | 'trending';

export interface FeedSection {
  id: string;
  title: string;
  tracks: UITrack[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
}

export interface PromoBannerProps {
  title: string;
  description: string;
  ctaPrimary?: { label: string; href: string; onClick?: () => void };
  ctaSecondary?: { label: string; href: string; onClick?: () => void };
  imageUrl?: string;
  variant?: 'default' | 'gradient' | 'video';
  onDismiss?: () => void;
}

export interface ContestInfo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  deadline: string;
  prizePool?: string;
  participantCount?: number;
  featured: boolean;
}

export interface ContestSectionProps {
  contests: ContestInfo[];
  isLoading?: boolean;
  onSelectContest?: (id: string) => void;
}

// ============================================================================
// WORKSPACE LAYOUT (3-Column Suno-like)
// ============================================================================

export interface WorkspaceShellProps {
  // Left panel
  leftPanel: React.ReactNode;
  // Center content
  centerContent: React.ReactNode;
  // Right panel (Inspector)
  rightPanel?: React.ReactNode;
  // Layout options
  showRightPanel?: boolean;
  rightPanelSticky?: boolean;
  // Mobile behavior
  mobileLayout?: 'tabs' | 'drawer';
}

// ============================================================================
// TRACK INSPECTOR (Right Panel)
// ============================================================================

export interface TrackInspectorProps {
  trackId: string;
  track?: UITrack;
  isLoading?: boolean;
  // Tabs
  activeTab?: 'overview' | 'versions' | 'stems' | 'details';
  onTabChange?: (tab: string) => void;
  // Actions
  onRemix?: () => void;
  onEdit?: () => void;
  onPublish?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  // Permissions
  canEdit?: boolean;
  canPublish?: boolean;
  canDelete?: boolean;
}

// ============================================================================
// STYLE EDITOR (Left Panel)
// ============================================================================

export interface StyleEditorProps {
  styles: string;
  chips: string[];
  onStylesChange: (value: string) => void;
  onChipsChange: (chips: string[]) => void;
  onChipAdd: (chip: string) => void;
  onChipRemove: (chip: string) => void;
  suggestions?: string[];
  maxChips?: number;
  disabled?: boolean;
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export type KeyboardShortcut =
  | 'play-pause' // Space or K
  | 'next' // L
  | 'prev' // J
  | 'seek-forward' // →
  | 'seek-backward' // ←
  | 'volume-up' // ↑
  | 'volume-down' // ↓
  | 'focus-search' // /
  | 'toggle-menu' // M
  | 'like' // F
  | 'queue-add' // Q
  | 'shuffle' // S
  | 'repeat' // R;

export interface KeyboardShortcutHandler {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (e: KeyboardEvent) => void;
  description: string;
  global?: boolean; // Works in any context
  disabled?: boolean;
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export type AnalyticsEvent =
  | 'track.play'
  | 'track.pause'
  | 'track.like'
  | 'track.unlike'
  | 'track.publish'
  | 'track.remix'
  | 'track.share'
  | 'track.download'
  | 'generation.start'
  | 'generation.finish'
  | 'generation.fail'
  | 'inspector.open'
  | 'menu.action'
  | 'queue.add'
  | 'permissions.save'
  | 'search.submit'
  | 'feed.load';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  trackId?: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Component visual states
 */
export type VisualState = 'default' | 'hover' | 'active' | 'disabled' | 'selected' | 'playing';

/**
 * Loading states for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
  progress?: number; // 0..100
}

/**
 * Pagination for infinite scroll
 */
export interface PaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  total?: number;
}

/**
 * Filter/Sort options for track lists
 */
export interface TrackListFilters {
  status?: TrackStatus[];
  visibility?: TrackVisibility[];
  search?: string;
  tags?: string[];
  provider?: string[];
  dateFrom?: string;
  dateTo?: string;
}

export type TrackSortBy =
  | 'created_at'
  | 'updated_at'
  | 'title'
  | 'duration'
  | 'play_count'
  | 'like_count';

export type TrackSortOrder = 'asc' | 'desc';

export interface TrackListSort {
  by: TrackSortBy;
  order: TrackSortOrder;
}
