# 📝 CHANGELOG - Albert3 Muse Synth Studio

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.6.3] - 2025-10-31

### 🎯 Sprint 31 - Phase 1: Critical Infrastructure

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

### 🔧 Changed

#### Edge Functions
- **generate-suno/index.ts:** Enhanced error handling with specific 429/402 responses
- **generate-mureka/index.ts:** Consistent error handling matching Suno implementation
- **describe-song/index.ts:** Fixed duplicate description issues with UPSERT logic

### 🐛 Fixed
- **Song Descriptions:** UPSERT now prevents duplicate entries for same track
- **Mureka audio_url:** Enhanced extraction from different response formats
- **Error Messages:** User-friendly Russian translations for all error types

### 📚 Documentation
- **NEW:** `docs/monitoring/METRICS.md` - Complete metrics & monitoring guide
- **NEW:** `docs/deployment/CRON_SETUP.sql` - CRON job setup script
- **NEW:** `docs/deployment/DEPLOYMENT_GUIDE.md` - Step-by-step deployment guide
- **NEW:** `project-management/SPRINT_31_TRACKING.md` - Sprint progress tracking
- **NEW:** `CHANGELOG.md` - This file!
- **UPDATED:** `docs/SPRINT_31_SUMMARY.md` - Phase 1 completion summary
- **UPDATED:** `docs/MASTER_IMPROVEMENT_ROADMAP.md` - Marked Week 1 tasks complete
- **UPDATED:** `docs/DEVELOPMENT_PLAN.md` - Current sprint status

### 🔐 Security
- Rate limiting properly enforced at edge function level
- Error responses don't leak sensitive information
- Service role key properly scoped for archiving operations

---

## Previous Versions

_For versions prior to 2.6.3, please see Git history_

---

**Maintained by:** AI Development Team  
**Last Updated:** 2025-10-31
