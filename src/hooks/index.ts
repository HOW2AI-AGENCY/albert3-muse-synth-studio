/**
 * Hooks barrel export
 * Sprint 31 Week 2: Consolidated hook exports
 */

// Navigation & Analytics
export * from './useNavigationTracking';
export * from './useUIInteractionTracking';

// Audio & Media
export { useAudioPlayer, useAudioPlayerSafe } from './useAudioPlayer';
export { useAudioRecorder } from './useAudioRecorder';
export { useMediaSession } from './useMediaSession';
export { useStemMixer } from './useStemMixer';

// Tracks & Generation
export { useTracks } from './useTracks';
export { useTrackSync } from './useTrackSync';
export { useTrackRecovery } from './useTrackRecovery';
export { useTrackCleanup } from './useTrackCleanup';
export { useGenerateMusic } from './useGenerateMusic';
export { useImprovePrompt } from './useImprovePrompt';
export { useExtendTrack } from './useExtendTrack';
export { useCreateCover } from './useCreateCover';
export { useStemSeparation } from './useStemSeparation';
export { useDownloadTrack } from './useDownloadTrack';
export { useConvertToWav } from './useConvertToWav';
export { useAudioUpload } from './useAudioUpload';

// Track Interactions (from features/tracks)
export { useTrackLike } from '../features/tracks/hooks/useTrackLike';
export { useTrackVersions, useTrackVersionCount, resetTrackVersionsCache } from '../features/tracks/hooks/useTrackVersions';

// Smart Playback
export { useSmartTrackPlay } from './useSmartTrackPlay';
export { usePlayAnalytics } from './usePlayAnalytics';

// Libraries & Collections
export { useSavedLyrics } from './useSavedLyrics';
export { useAudioLibrary } from './useAudioLibrary';

// Shared Actions (Sprint 31 Week 2)
export { useCardActions } from './useCardActions';

// UI Utilities
export { useIsMobile } from './use-mobile';
export { useMediaQuery } from './useMediaQuery';
export { useSwipeGesture } from './useSwipeGesture';
export { useIntersectionObserver, useLazyImage } from './useIntersectionObserver';
export { useDashboardData } from './useDashboardData';
export { useNotifications } from './useNotifications';
export { useProviderBalance } from './useProviderBalance';
export { useWorkspaceOffsets } from './useWorkspaceOffsets';

// Toast (shadcn/ui)
export { useToast, toast } from './use-toast';
