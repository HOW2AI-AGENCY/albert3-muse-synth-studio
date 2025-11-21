# 📝 CHANGELOG - Albert3 Muse Synth Studio

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added (2025-11-21)
- SUNOAPI-ORG audit documentation:
  - `docs/audit/SUNOAPI-ORG/UI_UX_AUDIT.md`
  - `docs/audit/SUNOAPI-ORG/ACCESSIBILITY_REPORT.md`
  - `docs/audit/SUNOAPI-ORG/API_INTEGRATION_AUDIT.md`
  - `docs/audit/SUNOAPI-ORG/LOAD_TEST_PLAN.md`
  - `docs/audit/SUNOAPI-ORG/SECURITY_AUDIT.md`
  - `docs/audit/SUNOAPI-ORG/VERSIONING_AUDIT.md`
  - `docs/audit/SUNOAPI-ORG/BUILD_PERFORMANCE_REPORT.md`
  - `docs/audit/SUNOAPI-ORG/CI_CD_AUDIT.md`
  - `docs/audit/SUNOAPI-ORG/MOBILE_PERFORMANCE_REPORT.md`
  - `docs/audit/SUNOAPI-ORG/AUDIT_MASTER_PLAN.md`
  - `docs/audit/SUNOAPI-ORG/ARCHITECTURE_DIAGRAMS.md`
  - `docs/audit/SUNOAPI-ORG/TECHNICAL_AUDIT_REPORT.md`
- Навигация документации: обновлён `docs/README.md`, добавлен `docs/DOCUMENTATION_INDEX.md`.

### Changed (2025-11-21)
- Оптимизирована структура раздела `docs/` — актуальные материалы сконцентрированы в `docs/audit/SUNOAPI-ORG/`.
- Обновлены диаграммы архитектуры и схемы взаимодействия (Mermaid).

### Removed (2025-11-21)
- Удалены устаревшие папки документации и отчётов:
  - `archive`, `project-management`, `reports`
  - `docs/api`, `docs/architecture`, `docs/archive`, `docs/assets`, `docs/components`, `docs/deployment`, `docs/design`, `docs/design_mockups`, `docs/development`, `docs/diagrams`, `docs/features`, `docs/guides`, `docs/integrations`, `docs/interface`, `docs/maintenance`, `docs/meetings`, `docs/mobile`, `docs/monitoring`, `docs/performance`, `docs/security`, `docs/specs`, `docs/sprint`, `docs/sprints`, `docs/storage`, `docs/testing`, `docs/versioning`, `docs/workspace`
- Удалены устаревшие отчёты в корне: `AUDIT_REPORT_2025-11-17.md`, `AUDIT_REPORT_2025-11-19.md`, `INTEGRATION_AND_UI_AUDIT_REPORT.md`, `PLAYER_AUDIT_REPORT.md`, `TRACK_CARD_AUDIT_REPORT.md`, `TRACK_CARD_MENU_FIX_REPORT.md`, `IMPROVEMENTS_SUMMARY.md`, `REFACTORING_PLAN.md`.
 - Удалены устаревшие аудиты/планы в `docs/audit/*` (кроме `SUNOAPI-ORG/`) и большинство файлов в корне `docs/` (сохранены `README.md`, `DOCUMENTATION_INDEX.md`).

Author: Trae AI Assistant
Links: See `docs/audit/SUNOAPI-ORG/CLEANUP_REPORT.md`

### Added

#### MusicVerse UI/UX Phase 1 (2025-11-19)

**New Components:**

- **WaveformProgressBar** (`src/components/player/mobile/WaveformProgressBar.tsx`)
  - Interactive waveform visualization using Web Audio API
  - Real-time peak extraction with RMS calculation for smoother visualization
  - Touch-based seeking with haptic feedback (10ms vibration pulse)
  - Dual-color progress indication (purple for played, muted for unplayed)
  - WCAG AAA compliant touch targets (48px minimum)
  - Performance optimized with canvas rendering and memoization
  - Keyboard accessibility (arrow keys for ±5s seeking)
  - Pointer Events API for unified touch/mouse handling
  - 100 customizable bars, 64px default height

- **HeroCard** (`src/components/cards/HeroCard.tsx`)
  - Premium card component for featured tracks, albums, and playlists
  - Glassmorphic background with backdrop blur effects
  - Gradient overlays for visual hierarchy and depth
  - Large cover art (140-220px) with scale-on-hover effect (1.02x)
  - 64px primary play button (WCAG AAA compliant)
  - Comprehensive metrics display (plays, likes, duration, track count)
  - Skeleton loading state (HeroCardSkeleton)
  - Size variants: default, large
  - Style variants: default, featured
  - Support for 3 content types: track, album, playlist
  - Relative time display (formatDistanceToNow)
  - Responsive: min-height 280px (default), 320px (large)

**Design System Enhancements:**

- **MusicVerse Design Tokens** (`src/styles/design-tokens.css`)
  - `--mv-surface-glass` - Semi-transparent surface (17% 0.6 alpha)
  - `--mv-surface-glass-hover` - Hover state (20% 0.7 alpha)
  - `--mv-surface-glass-active` - Active state (23% 0.8 alpha)
  - `--mv-surface-elevated` - Elevated cards (20%)
  - `--mv-surface-player` - Player background (14%)
  - `--mv-blur-*` - Backdrop blur values (4px, 8px, 16px, 24px, 40px)
  - `--mv-gradient-hero` - Hero section gradient
  - `--mv-gradient-card` - Card gradient (purple to blue)
  - `--mv-gradient-player` - Player gradient (3-stop)
  - `--mv-gradient-overlay` - Image overlay (transparent to 80%)
  - `--mv-waveform-played` - Purple accent for played portion
  - `--mv-waveform-unplayed` - Muted gray (25% opacity)
  - `--mv-waveform-progress` - Progress indicator line
  - `--mv-hero-card-*` - Hero card styling tokens
  - Player spacing presets (mobile: 16px, desktop: 32px)
  - Control sizes (48px, 64px for large)
  - Border radius presets (card: 16px, player: 20px, button: 12px, waveform: 8px)

- **Tailwind Config Extensions** (`tailwind.config.ts`)
  - `bg-mv-gradient-hero` - Hero gradient utility
  - `bg-mv-gradient-card` - Card gradient utility
  - `bg-mv-gradient-player` - Player gradient utility
  - `bg-mv-gradient-overlay` - Overlay gradient utility
  - `backdrop-blur-mv-*` - MusicVerse blur utilities (sm, md, lg, xl, player)
  - `bg-mv-surface-glass` - Glassmorphic surface
  - `bg-mv-surface-elevated` - Elevated surface
  - `bg-mv-surface-player` - Player background
  - `bg-mv-waveform-bg` - Waveform background
  - `bg-mv-hero-card` - Hero card background

**Component Updates:**

- **FullScreenPlayerMobile** (`src/components/player/fullscreen/FullScreenPlayerMobile.tsx`)
  - Integrated WaveformProgressBar replacing MobileProgressBar
  - Uses `currentTrack.audio_url` or `currentTrack.storage_audio_url` as fallback
  - Maintains 64px height for consistency
  - Preserves all existing gesture support (swipe-down, double-tap)

**Documentation:**

- **UI/UX Compliance Report** (`docs/audit/UI_UX_COMPLIANCE_REPORT_2025-11-19.md`)
  - Comprehensive analysis vs MusicVerse specification
  - Overall compliance score: 75% (7.5/10)
  - Category breakdown: Design System (85%), Components (65%), Mobile Optimization (80%), Animations (70%)
  - 3-phase implementation roadmap (2.5-3 weeks total)
  - Phase 1 (P0, 5.5 days): Waveform, Hero Cards, Playlist Headers
  - Phase 2 (P1, 3 days): Transitions, Carousels, Typography
  - Phase 3 (P2, 2 days): Welcome Page, Search Bar, Micro-animations
  - Detailed component specifications with code examples

**Refactoring:**

- **Supabase Monkey-Patching Removal**
  - Created `SupabaseFunctions` wrapper class (`src/integrations/supabase/functions.ts`, 237 lines)
  - Removed monkey-patching from `src/integrations/supabase/client.ts` (~70 lines removed)
  - Migration script: `scripts/refactor/replace-supabase-functions.sh`
  - Updated 62 production files: all services, hooks, components
  - Updated test mocks: GenerationService.test.ts, useAddVocal.test.ts
  - Improved testability and maintainability
  - **Result:** Clean codebase, no runtime modifications

- **ApiService Decomposition (God Class → Domain Services)**
  - Split 563-line ApiService into 5 domain-specific services:
  - `TrackService` (~350 lines): getUserTracks, getById, delete, updateStatus, etc.
  - `LyricsService` (~70 lines): generate method with retry logic
  - `PromptService` (~80 lines): improve method with KPI tracking
  - `BalanceService` (~150 lines): getProviderBalance with deduplication & caching
  - `StemService` (~70 lines): syncJob for stem separation
  - Added deprecation warnings to ApiService
  - Maintained backward compatibility during migration
  - **Result:** Improved maintainability, Single Responsibility Principle

- **Documentation: Lyrics System** (`docs/LYRICS_SYSTEM.md` v2.0) - Comprehensive 800+ line guide
  - 3-level lyrics architecture (Timestamped, Structured, Library)
  - 6 Mermaid diagrams (architecture, flows, caching)
  - API & services documentation
  - UI improvement roadmap (P0-P2 priorities)
- **Sprint 35 Plan** (`project-management/SPRINT_35_LYRICS_UX.md`) - Lyrics UX improvements (Nov 23 - Dec 6)
  - P0: Mobile font optimization + touch accessibility (WCAG AAA)
  - P1: Dark theme, settings dialog, smart prefetch
  - P2: Export to .lrc/.txt/.srt formats
  - 61 story points, detailed acceptance criteria
- Documentation: `docs/architecture/webhooks.md` — архитектура вебхуков Suno (идемпотентность, обработка ошибок, диаграммы)
- README: разделы про обработку вебхуков и очистку Supabase Storage
- Project management: `project-management/SPRINT_STATUS.md`, `docs/sprints/SPRINT_33_...`, `docs/sprints/SPRINT_34_...`
- Z-Index System: Added missing `--z-bottom-tab-bar` and `--z-control-buttons` CSS variables
- Z-Index System: Mobile-specific media queries for proper stacking on screens ≤767px
- Tailwind Config: Complete z-index token integration in theme configuration

### Changed
- Supabase Edge Functions: добавлены механизмы идемпотентности для `generate-music-callb` (извлечение `x-delivery-id`, кеширование, корректные ответы)
- Callback processor: расширена обработка ошибочных коллбеков (валидация, логирование, безопасные ответы)
- Storage cleanup: пагинация, удаление `deleted_at`, подготовка к учёту `archived_at`
- Z-Index Hierarchy: Unified z-index system across all components
  - Bottom Navigation: 1000
  - Control Buttons: 1050
  - Mini Player: 1100
  - Modal Layers: 1150-1210
  - Tooltips: 1200

### Fixed
- **P0.1 Critical:** Mobile generation button hidden by z-index conflicts (Commit 52b2235)
  - CompactCustomForm: Added `z-index: var(--z-control-buttons)` (1050) to sticky footer
  - Ensures generation button appears above bottom navigation (z-index: 1000)
  - Added safe-area-bottom classes for proper mobile spacing
  - Matches fix already applied in SimpleModeCompact.tsx
- **P0.1 Critical:** Mobile generation button hidden by z-index conflicts
  - SimpleModeCompact: Changed z-index from `--z-mini-player` to `--z-control-buttons`
  - SelectionToolbar: Updated z-index to prevent overlap with player
  - Fixed proper stacking order: Navigation < Controls < Player < Modals
- **P1 Critical:** Mobile drawer overlay below bottom navigation
  - Increased `--z-drawer` from 200 to 1140 (above navigation, below modals)
  - Ensures drawer backdrop covers navigation when open
  - Fixed modal behavior on mobile devices

### Security
- Webhook Idempotency: предотвращение повторной обработки дублей доставки
- CI: подтверждены Deno‑тесты для Edge функций
- **Verified P0.2:** Server-side rate limiting active (Redis-based, 10 req/hour, X-RateLimit-* headers)
  - Both generate-suno and generate-mureka protected
  - HTTP 429 with retry-after on limit exceeded
- **Verified P0.3:** Webhook authentication active (HMAC-SHA256 signature verification)
  - mureka-webhook: X-Mureka-Signature validation
  - suno-callback: X-Suno-Signature validation
  - Returns 401 on invalid/missing signatures
- **Verified P0.4:** Circuit Breaker integrated in Suno & Mureka APIs (5 failures, 60s timeout)
- **Verified P0.5:** Retry logic with exponential backoff (3 attempts, 1000ms initial delay, jitter for 429s)

### Planned
- **Sprint 34** (Nov 15-22): Webhook signature docs, `tracks.archived_at`, integration tests, metrics
- **Sprint 35** (Nov 23 - Dec 6): Lyrics UX improvements
  - Mobile font size optimization (≥18px)
  - Touch accessibility audit (≥44px targets)
  - Dark theme for lyrics display
  - Settings dialog (font size, auto-scroll, display mode)
  - Smart prefetch optimization (cache hit rate >70%)
  - Export to .lrc/.txt/.srt
- **Sprint 36** (Dec 7-20): Critical fixes & UX (error boundaries, network detection, input sanitization)
- Performance monitoring dashboards
- Load testing framework

---

## [2.6.3] - 2025-10-31

### 🎯 Sprint 31 - Critical Infrastructure (95% Complete)

### 🎉 Added

#### Track Archiving System
- **NEW Edge Function:** `archive-tracks` - Automated archiving of tracks to Supabase Storage
- Prevents data loss by downloading tracks before provider expiration (15 days)
- Archives audio, cover, and video files to permanent storage
- Comprehensive error handling and job tracking via `track_archiving_jobs` table
- Ready for hourly CRON execution via pg_cron

#### Enhanced Error Handling
- **Rate Limit Errors (429):** Proper forwarding from edge functions with `Retry-After` headers
- **Insufficient Credits (402):** User-friendly error messages with upgrade prompts
- **Error Classification:** Standardized error codes (`RATE_LIMIT_EXCEEDED`, `INSUFFICIENT_CREDITS`, `INTERNAL_ERROR`)
- **UI Error Handler:** `generation-errors.ts` utility for consistent error display
- Toast notifications with actionable buttons (e.g., "Пополнить баланс")

#### Monitoring & Metrics
- **Metrics Collector:** `src/utils/monitoring/metrics.ts` for tracking:
  - Generation metrics (started, completed, failed)
  - Archiving metrics (success/failure rates)
  - Rate limit hits by provider
- **Monitoring Service:** `src/services/monitoring.service.ts`:
  - Web Vitals tracking (CLS, FCP, LCP, TTFB, INP)
  - API health checks (Suno, Mureka)
  - Generation performance tracking
- **Custom Hook:** `useGenerationMonitoring` for automatic metric tracking in React components
- **Sentry Integration:** Automatic error reporting and performance metrics
- **Documentation:** `docs/monitoring/METRICS.md` with Grafana queries and SLO targets

#### Database Optimization
- **10 Strategic Indexes:** Optimized query performance by +90%
  - `idx_tracks_status_user` - User's track listing
  - `idx_tracks_created_at` - Chronological sorting
  - `idx_tracks_archive` - Archiving job queries
  - `idx_track_likes_composite` - Like tracking
  - And 6 more critical indexes
- **Materialized Views:** Pre-aggregated analytics in `analytics` schema
  - `user_stats` - User activity metrics
  - `analytics_generations_daily` - Daily generation counts
  - `analytics_top_genres` - Genre popularity
  - `archive_statistics` - Archiving metrics
- **Security Definer Functions:** Optimized RLS policy checks

### 🔧 Changed

#### Edge Functions
- **generate-suno/index.ts:** Enhanced error handling with 429/402 specific responses
- **generate-mureka/index.ts:** Matching error handling implementation
- **describe-song/index.ts:** Fixed duplicate descriptions with UPSERT logic
- **archive-tracks/index.ts:** Production-ready archiving with retries

#### Type System
- **monitoring.service.ts:** Added `CombinedHealthStatus` type
- **useServiceHealth.ts:** Fixed TypeScript errors for service health
- **generation-errors.ts:** User-friendly error message mapping

### 🐛 Fixed
- ✅ Song descriptions: UPSERT prevents duplicates
- ✅ Mureka audio_url: Enhanced extraction from API
- ✅ Service health types: Resolved TypeScript errors
- ✅ Error messages: Russian translations for all codes

### 📚 Documentation

#### New Documents
- ✅ `docs/monitoring/METRICS.md` - Complete metrics & monitoring guide
- ✅ `docs/deployment/CRON_SETUP.sql` - Automated CRON setup script
- ✅ `docs/deployment/DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- ✅ `project-management/SPRINT_31_FINAL_REPORT.md` - Sprint summary
- ✅ `project-management/SPRINT_32_PLAN.md` - Next sprint planning
- ✅ `CHANGELOG.md` - This file!

#### Updated Documents
- ✅ `docs/DEVELOPMENT_PLAN.md` - Sprint 32 roadmap
- ✅ `docs/INDEX.md` - Complete documentation index
- ✅ `project-management/README.md` - Current sprint status

#### Removed (Obsolete)
- 🗑️ `docs/OPTIMIZATION_SUMMARY.md` - Merged into final report
- 🗑️ `docs/sprint-31-week-1-completion.md` - Superseded by final report
- 🗑️ `project-management/SPRINT_30_PLAN.md` - Archived
- 🗑️ `project-management/SPRINT_31_STATUS.md` - Superseded by final report
- 🗑️ `project-management/SPRINT_31_TRACKING.md` - Superseded by final report
- 🗑️ `docs/SPRINT_31_SUMMARY.md` - Merged into final report

### 🔐 Security
- ✅ Security warnings: 6 → 1 (83% reduction)
- ✅ Rate limiting: Proper enforcement with retry-after headers
- ✅ Error messages: No sensitive data exposure
- ✅ RLS policies: Security definer functions for performance

---

## Previous Versions

_For versions prior to 2.6.3, please see Git history_

---

**Maintained by:** AI Development Team  
**Last Updated:** 2025-10-31
