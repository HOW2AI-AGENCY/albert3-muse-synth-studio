# 00_SYSTEM_CONTEXT.md - Albert3 Muse Synth Studio System Context

**Version:** 1.0.0
**Last Updated:** 2025-11-20
**Status:** Production

---

## System Overview

**Albert3 Muse Synth Studio** is a professional AI-powered music generation platform that enables users to create, manage, and collaborate on music compositions using state-of-the-art AI providers.

### Mission Statement

Democratize music production by providing accessible, high-quality AI music generation tools to musicians, producers, and content creators worldwide.

### Core Value Proposition

- **AI-First:** Leveraging Suno AI, Mureka, and Minimax for music generation
- **Professional Grade:** Studio-quality outputs with track versioning and stem separation
- **Scalable:** Built on Supabase for global scale and reliability
- **Real-time:** Live updates via WebSockets and Supabase Realtime

---

## Technology Stack

### Frontend
- **Framework:** React 18.3.1 + TypeScript 5.8.3
- **Build Tool:** Vite 7.1.12
- **Routing:** React Router 6.30.1
- **State Management:** TanStack Query 5.90.2 + Zustand 5.0.8
- **UI:** shadcn/ui (Radix UI) + Tailwind CSS 3.4.17
- **Animation:** Framer Motion 12.23.24

### Backend
- **BaaS:** Supabase (PostgreSQL + Edge Functions)
- **Runtime:** Deno (Edge Functions)
- **Storage:** Supabase Storage (S3-compatible)
- **Realtime:** Supabase Realtime (WebSockets)
- **Cache:** Redis (Upstash)

### External Services
- **Suno AI:** Music generation (primary)
- **Mureka:** Audio analysis and recognition
- **Replicate:** Audio processing (stems, upscale)
- **Sentry:** Error tracking and monitoring

---

## Key Metrics

### Performance
- **Page Load:** < 2s (First Contentful Paint)
- **Generation Latency:** 30-90s average
- **Realtime Update:** < 1s latency
- **API Success Rate:** 99.5%

### Scale
- **Users:** 10K+ registered
- **Tracks Generated:** 100K+
- **Database Size:** ~50GB
- **Storage:** ~500GB (audio/video files)
- **Daily Active Users:** 1K+

### Business
- **Conversion Rate:** 15% (Free → Pro)
- **Retention:** 60% (30-day)
- **Avg Session Duration:** 25 minutes

---

## Architecture Principles

1. **Separation of Concerns** — Features are isolated and modular
2. **API-First** — All features accessible via REST/GraphQL
3. **Real-time First** — Optimistic updates with WebSocket sync
4. **Idempotent** — All mutations are idempotent (safe to retry)
5. **Observable** — Comprehensive logging and monitoring
6. **Secure by Default** — RLS, input sanitization, CSRF protection

---

## System Context Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USERS                                │
│  Musicians | Producers | Content Creators | Hobbyists       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ALBERT3 MUSE SYNTH STUDIO                  │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Frontend   │  │   Backend   │  │   Storage   │        │
│  │  (React)    │→│  (Supabase) │→│  (S3-like)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │ Suno AI │  │ Mureka  │  │Replicate│  │ Sentry  │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Domain Model

### Core Entities

1. **User / Profile** — User account and subscription
2. **Track** — Generated music composition
3. **Track Version** — Variant of a track (Suno generates 2 variants)
4. **Project** — Collection of tracks (album/EP)
5. **Lyrics** — Song lyrics with timestamps
6. **Persona** — Voice profile for generation

### Key Relationships

```
User (1) ───< (N) Track
User (1) ───< (N) Project
Track (1) ───< (N) TrackVersion
Track (N) ───> (N) Project (via project_tracks)
Track (1) ───< (N) TrackStem
```

---

## User Roles

| Role | Permissions | Features |
|------|-------------|----------|
| **Free** | Read own data, Generate 10 tracks/month | Basic generation, 2 concurrent jobs |
| **Pro** | Read own data, Generate 100 tracks/month | Advanced features, 5 concurrent jobs, stem separation |
| **Premium** | Read own data, Unlimited generations | All features, 10 concurrent jobs, priority support |
| **Admin** | Full access | User management, system monitoring, feature flags |

---

## Security Model

### Authentication
- **Method:** Supabase Auth (JWT tokens)
- **Providers:** Email/Password, Google OAuth, Telegram
- **Token Expiry:** 1 hour (refresh tokens valid 30 days)

### Authorization
- **Strategy:** Row Level Security (RLS) + Role-Based Access Control (RBAC)
- **Enforcement:** Database level (PostgreSQL policies)

### Data Protection
- **At Rest:** AES-256 encryption (Supabase Storage)
- **In Transit:** TLS 1.3 (all connections)
- **PII:** Hashed passwords (bcrypt), encrypted emails

---

## Compliance

### GDPR
- **Right to Access:** User can export all data via API
- **Right to Deletion:** Cascade delete on user account deletion
- **Right to Rectification:** User can edit all personal data

### Data Retention
- **Active Tracks:** Indefinite
- **Archived Tracks:** 90 days (then moved to cold storage)
- **Logs:** 30 days
- **Analytics:** 1 year (anonymized)

---

## Deployment

### Environments

| Environment | URL | Purpose | Auto-Deploy |
|-------------|-----|---------|-------------|
| **Production** | app.albert3.io | Live system | ✅ (main branch) |
| **Staging** | staging.albert3.io | Pre-production testing | ✅ (develop branch) |
| **Preview** | pr-{number}.lovable.app | Pull request previews | ✅ (all PRs) |
| **Local** | localhost:5173 | Development | ❌ (manual) |

### CI/CD Pipeline

```
GitHub Push → GitHub Actions → Tests → Build → Deploy to Lovable/Supabase
```

**Steps:**
1. Lint (ESLint)
2. Type Check (TypeScript)
3. Unit Tests (Vitest)
4. Build (Vite)
5. Deploy Edge Functions (Supabase CLI)
6. Migrate Database (Supabase Migrations)

---

## Monitoring & Observability

### Metrics Dashboard
- **Sentry:** Error tracking, performance monitoring
- **Supabase Dashboard:** Database queries, API calls
- **Google Analytics:** User behavior, funnels
- **Custom:** Generation success rate, latency percentiles

### Alerts

| Alert | Threshold | Channel |
|-------|-----------|---------|
| **Error Rate** | > 5% | Sentry → Slack |
| **API Latency** | P95 > 5s | Supabase → Email |
| **Generation Failures** | > 10% | Custom → Telegram |
| **Credits Low** | < 1000 | Email |

---

## Disaster Recovery

### Backup Strategy
- **Database:** Daily automated backups (Supabase)
- **Storage:** Replicated to 3 regions (S3)
- **Point-in-Time Recovery:** 7 days (Supabase)

### RTO/RPO
- **Recovery Time Objective (RTO):** < 1 hour
- **Recovery Point Objective (RPO):** < 5 minutes

---

## Contact & Support

- **Documentation:** https://docs.albert3.io
- **API Docs:** https://api.albert3.io/docs
- **Support:** support@albert3.io
- **GitHub:** https://github.com/HOW2AI-AGENCY/albert3-muse-synth-studio

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-20
**Maintained By:** HOW2AI-AGENCY Development Team
