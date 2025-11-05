# Suno Integration - Production Readiness Checklist

**Status:** ✅ Core Implementation Complete
**Next Phase:** Testing & Enhancement
**Last Updated:** 2025-11-05

> **Quick Reference:** Use this checklist before deploying to production. See [SUNO_INTEGRATION_ANALYSIS.md](./SUNO_INTEGRATION_ANALYSIS.md) for full details.

---

## Pre-Production Checklist

### 🔒 Security

- [x] JWT authentication implemented in all Edge Functions
- [x] Zod schema validation for all inputs
- [x] HMAC signature verification code exists
- [ ] **ACTION REQUIRED:** Set `SUNO_WEBHOOK_SECRET` in production environment
- [ ] **ACTION REQUIRED:** Remove fallback path that skips signature verification (line 76-78 in `replace-section-callback/index.ts`)
- [x] Track ownership verification in `replace-section`
- [x] Rate limiting handling (429, 402 errors)

**Risk Level:** 🔴 **HIGH** - Webhook signature verification must be enforced in production

---

### 🧪 Testing

#### Unit Tests (Priority: 🔴 HIGH)
- [ ] Write tests for `replace-section` Edge Function
  - [ ] Authentication checks
  - [ ] Input validation (5-30s duration)
  - [ ] Ownership verification
  - [ ] Suno API error handling
- [ ] Write tests for `replace-section-callback` Edge Function
  - [ ] Signature verification (valid/invalid)
  - [ ] Idempotency (duplicate taskId)
  - [ ] Version creation logic
  - [ ] Error path handling
- [ ] Write tests for `get-timestamped-lyrics` Edge Function
  - [ ] Cache hit/miss scenarios
  - [ ] Empty alignedWords for instrumental tracks
- [ ] Write tests for `useReplaceSection` hook
  - [ ] Client-side validation
  - [ ] React Query invalidation

**Target:** 80% code coverage

#### Integration Tests (Priority: 🟡 Medium)
- [ ] End-to-end replace section flow (UI → Backend → Callback → Realtime)
- [ ] Timestamped lyrics retrieval (cached vs uncached)
- [ ] Realtime subscription updates

#### Load Tests (Priority: 🟡 Medium)
- [ ] 10 concurrent replacement requests
- [ ] Callback processing under load
- [ ] Karaoke view rendering performance (target: 55-60 FPS)

**Tool:** k6 or Playwright (see SUNO_INTEGRATION_ANALYSIS.md for scripts)

---

### 📊 Monitoring & Alerting

#### Metrics Setup (Priority: 🟡 Medium)
- [ ] Track replacement request success rate (target: > 95%)
- [ ] Track callback processing time (target: < 5s)
- [ ] Track timestamped lyrics cache hit rate (target: > 80%)
- [ ] Track API error rates (429/402/500) (target: < 1%)

#### Alerts Setup (Priority: 🔴 HIGH)
- [ ] Alert if > 5 replacements stuck for > 5 minutes
- [ ] Alert if error rate > 5% in 5 minutes
- [ ] Alert if 402 errors detected (insufficient credits)
- [ ] Alert if > 10 signature verification failures in 1 hour

**Recommended Tools:** Sentry, Datadog, or Supabase Dashboard

#### Monitoring Queries
```sql
-- Find stuck replacements (run every 5 minutes)
SELECT id, parent_track_id, suno_task_id, status, created_at
FROM track_section_replacements
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';
```

---

### 🎛️ Environment Variables

#### Production Secrets (Supabase Dashboard)
- [x] `SUNO_API_KEY` - Configured
- [x] `SUPABASE_URL` - Auto-configured
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Configured
- [ ] **ACTION REQUIRED:** `SUNO_WEBHOOK_SECRET` - ⚠️ **MUST SET BEFORE PRODUCTION**

#### Frontend Environment (.env.production)
- [ ] `VITE_FEATURE_REPLACE_SECTION=false` (enable via rollout plan)
- [ ] `VITE_FEATURE_TIMESTAMPED_LYRICS=false` (enable via rollout plan)

---

### 🚀 Deployment Steps

#### Step 1: Feature Flags (Day 1)
- [ ] Add feature flags to `src/config/features.ts`
- [ ] Wrap UI components with feature flag checks
- [ ] Deploy with flags disabled in production

#### Step 2: Staging Deployment (Week 1)
- [ ] Deploy to staging environment
- [ ] Set `SUNO_WEBHOOK_SECRET` in staging
- [ ] Run full test suite
- [ ] Monitor for 48 hours with no errors

#### Step 3: Canary Rollout (Week 2)
- [ ] Enable for 5% of production users
- [ ] Monitor metrics for 1 week
- [ ] Verify success rate > 95%

#### Step 4: Gradual Rollout (Weeks 3-4)
- [ ] 25% of users (Week 3)
- [ ] 50% of users (Week 4)
- [ ] Pause if issues detected

#### Step 5: Full Production (Week 5)
- [ ] 100% of users
- [ ] Update documentation
- [ ] Create user tutorials

---

### 📋 Documentation

- [x] Technical analysis document created (`SUNO_INTEGRATION_ANALYSIS.md`)
- [x] Quick reference checklist created (`SUNO_INTEGRATION_CHECKLIST.md`)
- [ ] Update API documentation (`docs/API.md`) with new endpoints
- [ ] Update user guide with replace section feature
- [ ] Create video tutorials (optional)

---

## Enhancement Backlog (Post-Launch)

### High Priority 🔴
- [ ] Implement request ID correlation for debugging
- [ ] Add karaoke visualization in player
- [ ] Write comprehensive unit tests (80% coverage target)

### Medium Priority 🟡
- [ ] Add section preview functionality
- [ ] Show estimated credit cost before replacement
- [ ] Optimize waveform rendering (lazy load, downsample)
- [ ] Add waveform visualization toggle

### Low Priority 🟢
- [ ] A/B test karaoke feature engagement
- [ ] Explore batch replacement API (if Suno adds support)
- [ ] Add usage analytics dashboard

---

## Rollback Plan

### Fast Rollback (< 5 minutes)
```bash
# Disable feature flags immediately
# Update in Supabase Dashboard or .env
VITE_FEATURE_REPLACE_SECTION=false
VITE_FEATURE_TIMESTAMPED_LYRICS=false
```

### Edge Function Rollback (< 15 minutes)
```bash
cd supabase/functions
git log --oneline replace-section/
git revert <commit-hash>
npx supabase functions deploy replace-section
npx supabase functions deploy replace-section-callback
npx supabase functions deploy get-timestamped-lyrics
```

### Rollback Triggers
- Success rate < 90% for 10 minutes
- More than 10 stuck replacements in 1 hour
- Critical security issue detected
- Suno API outage (extended downtime)

---

## Key Performance Indicators (KPIs)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Replacement Success Rate | > 95% | N/A | 🟡 Not measured yet |
| Callback Processing Time | < 5s | N/A | 🟡 Not measured yet |
| Stuck Replacements | 0 | N/A | 🟡 Not measured yet |
| Cache Hit Rate (Lyrics) | > 80% | N/A | 🟡 Not measured yet |
| API Error Rate | < 1% | N/A | 🟡 Not measured yet |
| Karaoke View FPS | 55-60 | N/A | 🟡 Not measured yet |

**Note:** Update this table after staging deployment

---

## Support Contacts

- **Technical Issues:** [Engineering Team]
- **Security Issues:** [Security Team]
- **Suno API Issues:** [Suno Support](https://sunoapi.org/support)
- **On-Call Rotation:** [Insert Pagerduty/Opsgenie Link]

---

## Quick Commands

### Deploy Edge Functions
```bash
cd supabase/functions
npx supabase functions deploy replace-section
npx supabase functions deploy replace-section-callback
npx supabase functions deploy get-timestamped-lyrics
```

### Run Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Load tests
k6 run tests/load/replace-section-load.js
```

### Check Stuck Replacements
```sql
SELECT COUNT(*)
FROM track_section_replacements
WHERE status = 'processing'
  AND created_at < NOW() - INTERVAL '5 minutes';
```

### View Recent Errors
```sql
SELECT *
FROM callback_logs
WHERE callback_type = 'replace_section'
  AND (payload->>'code')::int != 200
ORDER BY created_at DESC
LIMIT 10;
```

---

## Sign-off

- [ ] **Engineering Lead:** Code review complete
- [ ] **QA Lead:** Testing complete
- [ ] **Security Lead:** Security audit passed
- [ ] **Product Manager:** Feature approved for launch
- [ ] **DevOps Lead:** Monitoring and alerts configured

**Approval Date:** _______________

---

**For detailed implementation guide, see:** [SUNO_INTEGRATION_ANALYSIS.md](./SUNO_INTEGRATION_ANALYSIS.md)
