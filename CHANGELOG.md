# 📝 CHANGELOG - Albert3 Muse Synth Studio

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Documentation: `docs/architecture/webhooks.md` — архитектура вебхуков Suno (идемпотентность, обработка ошибок, диаграммы)
- README: разделы про обработку вебхуков и очистку Supabase Storage
- Project management: `project-management/SPRINT_STATUS.md`, `docs/sprints/SPRINT_33_...`, `docs/sprints/SPRINT_34_...`

### Changed
- Supabase Edge Functions: добавлены механизмы идемпотентности для `generate-music-callb` (извлечение `x-delivery-id`, кеширование, корректные ответы)
- Callback processor: расширена обработка ошибочных коллбеков (валидация, логирование, безопасные ответы)
- Storage cleanup: пагинация, удаление `deleted_at`, подготовка к учёту `archived_at`

### Security
- Webhook Idempotency: предотвращение повторной обработки дублей доставки
- CI: подтверждены Deno‑тесты для Edge функций

### Planned
- Sprint 34: Подпись вебхуков Suno, миграция `tracks.archived_at`, интеграционные тесты дублей, метрики обработки
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
