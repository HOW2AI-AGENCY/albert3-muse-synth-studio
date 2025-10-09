# 🧠 Граф знаний проекта

Ниже представлена модель ключевых сущностей и связей системы Albert3 Muse Synth Studio. Этот документ комплементарен живому графу в рабочем окружении и предназначен для обзора на уровне документации.

## 📦 Сущности

- Project: Albert3 Muse Synth Studio
- Subsystem: Frontend Layer
- Subsystem: Backend Layer
- Subsystem: Data Schema
- Component: Supabase Client (Frontend)
- Component: API Service
- Process: Auth Flow
- Policy: Edge Function Security
- Integration: Suno Integration
- Integration: Replicate Integration
- Integration: Lovable AI Integration
- Domain: Tracks Domain
- Subsystem: Testing & QA
- Subsystem: Deployment & CI/CD
- Risk: Security Posture

## 🔗 Связи

- Project → includes → Frontend Layer
- Project → includes → Backend Layer
- Project → persists_to → Data Schema
- Frontend Layer → uses → Supabase Client (Frontend)
- Frontend Layer → calls → API Service
- API Service → invokes_functions → Backend Layer
- Backend Layer → enforces → Edge Function Security
- Backend Layer → integrates_with → Suno Integration
- Backend Layer → integrates_with → Replicate Integration
- Backend Layer → integrates_with → Lovable AI Integration
- Tracks Domain → represented_in → Data Schema
- Frontend Layer → implements → Auth Flow
- Deployment & CI/CD → deploys → Project
- Testing & QA → verifies → Project
- Security Posture → risks → Project
- Edge Function Security → requires → Auth Flow
- Suno Integration → produces → Tracks Domain
- Replicate Integration → produces → Tracks Domain

## 📝 Наблюдения (выдержки)

- Frontend: React SPA, TanStack Query, контексты проигрывателя, `src/integrations/supabase/client.ts`
- Backend: Supabase Edge Functions, общие модули `_shared/*`, строгая валидация
- Data: `tracks`, `track_versions`, `track_stems`, `track_likes`, `play_analytics`, `profiles`
- Security: JWT, RLS, rate limit, CORS, security headers
- Интеграции: Suno, Replicate, Lovable AI; нормализация ошибок и данных

— Обновлено: 09.10.2025