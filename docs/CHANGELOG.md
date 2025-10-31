# Changelog

All notable changes to Albert3 Muse Synth Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - Sprint 31 (Technical Debt Closure)

### In Progress
- Comprehensive technical debt analysis (147 issues identified)
- Security fixes: Supabase Linter issues, Rate Limiting
- Performance: Virtualization for TracksList/LyricsLibrary
- Architecture: Zustand migration, GenerationHandler base class
- Testing: Unit/E2E tests (target 80% coverage)

## [2.7.5] - 2025-10-31

### Added
- Force Generation feature (bypass duplicate detection)
- CachedTrackBanner component for UX clarity
- Enhanced Mureka generation logging
- Detailed audio playback error tracking
- Storage RLS verification for public audio access

### Changed
- GenerationService: Added `forceNew` parameter
- generate-mureka: Sentry transaction tracking for polling
- useAudioPlayback: Enhanced error logging with network state
- Documentation: FORCE_GENERATION.md, MUREKA_GENERATION_FIXES.md

### Fixed
- Mureka audio playback issues (Storage RLS verified)
- Cached track detection UX (users now informed)
- Sentry breadcrumbs for Mureka API calls
- Audio download error handling with HTTP status checks

## [2.7.4] - 2025-01-30

### Added
- Lyrics Library feature with save/edit/delete functionality
- Audio Library for reference audio management
- Edge Functions: `save-lyrics`, `audio-library`
- Hooks: `useSavedLyrics`, `useAudioLibrary`
- UI Components: `LyricsLibrary`, `LyricsCard`, `LyricsPreviewPanel`

### Changed
- Updated database schema with `saved_lyrics` and `audio_library` tables
- Improved RLS policies for lyrics and audio data

## [2.7.3] - 2025-01-28

### Added
- Performance monitoring utilities (`src/utils/sentry/performance.ts`)
- E2E tests for performance, retry logic, caching, error handling
- Unit tests for PerformanceMonitor and RetryWithBackoff
- Monitoring dashboard documentation

### Changed
- Enhanced logging in Edge Functions
- Improved error messages in generation flow

### Fixed
- Edge Function stability improvements
- Database query optimizations

## [2.7.2] - 2025-01-25

### Added
- Mureka provider support for AI music generation
- Provider selection UI component
- Balance checking for multiple providers (Suno, Mureka)

### Changed
- Unified provider interface in `src/services/providers/router.ts`
- Improved generation service architecture

### Fixed
- Provider-specific parameter handling
- Balance caching improvements

## [2.7.1] - 2025-01-22

### Added
- Track versions system for managing multiple variants
- Cover creation feature
- Track extension functionality
- Upload and extend audio capability

### Changed
- Database schema updated with `track_versions` table
- Enhanced track metadata structure

### Fixed
- Audio URL expiry handling
- Version management edge cases

## [2.7.0] - 2025-01-20

### Added
- Suno API integration for music generation
- Stems separation feature (vocals/instrumental)
- Advanced generation parameters (weights, constraints)
- Real-time generation progress tracking

### Changed
- Complete rewrite of generation flow
- Improved Edge Functions architecture
- Enhanced error handling and logging

### Fixed
- Generation timeout issues
- File upload reliability
- Polling mechanism stability

## [2.6.0] - 2025-01-15

### Added
- User authentication system (Supabase Auth)
- User profiles with credits system
- Role-based access control (admin/moderator/user)
- Track likes and social features

### Changed
- Database schema with RLS policies
- Security enhancements across all tables

### Fixed
- Authentication edge cases
- RLS policy conflicts

## [2.5.0] - 2025-01-10

### Added
- Audio player with queue management
- Mini player and full-screen player modes
- Playback controls and volume management
- Track library with search and filters

### Changed
- UI/UX improvements for workspace
- Mobile-responsive design

### Fixed
- Audio playback issues on Safari
- Player state synchronization

## [2.0.0] - 2025-01-01

### Added
- Initial release of Albert3 Muse Synth Studio
- Basic music generation functionality
- Track management system
- Workspace interface

---

## Legend

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

## Version Format

`MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward-compatible)
- **PATCH**: Bug fixes (backward-compatible)
