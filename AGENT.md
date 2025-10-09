# AGENT.md

Версия: 2025-10-09  
Репозиторий: HOW2AI-AGENCY/albert3-muse-synth-studio  
Описание репозитория (из GitHub): ПЛАТФОРМА ДЛЯ ВИРТУАЛЬНЫХ МУЗЫКАНТОВ - ГЕНЕРАЦИЯ МУЗЫКИ И ПОЛНОЦЕННЫХ ТРЕКОВ С ВОКАЛОМ С ПОМОЩЬЮ ИИ

Цель документа
- Предоставить максимально точную, детальную и готовую к использованию спецификацию для разработки, тестирования и эксплуатации автономных ИИ-агентов (далее — агенты) и сопутствующих сервисов в проекте albert3-muse-synth-studio.
- Описать рабочий пайплайн, структуру приложения, архитектуру, контрактные интерфейсы, полный набор методов/функций и детальную интеграцию с Suno (sunoapi.org), включая примеры запросов/ответов, схемы ошибок и рекомендации по обработке.

Примечание о точности
- Документ составлен опираясь на описание репозитория и языковой состав (TypeScript основной язык). Конкретные пути в кодовой базе и имена файлов/классов приведены в виде рекомендуемой и ожидаемой структуры для TypeScript-проекта; если в репозитории часть файлов уже реализована, используйте этот документ как authoritative спецификацию для реализации/рефакторинга.

Содержание
- 1. Общая архитектура
- 2. Компоненты и структура кода (файловая организация)
- 3. Статическая модель данных (Postgres / DB схемы)
- 4. Рабочий пайплайн агента — пошагово
- 5. Контракты: JSON схемы задач/результатов
- 6. Полная интеграция с Suno (adapter): endpoints, payloads, обработка ошибок
- 7. Интерфейсы и API агента (TypeScript сигнатуры + реализационные скелеты)
- 8. Сторонние интеграции (S3/MinIO, Redis, RabbitMQ, Postgres)
- 9. Надёжность: retry, idempotency, транзакции
- 10. Безопасность и секреты
- 11. Observability: логирование, метрики, tracing
- 12. CI/CD, локальная разработка и тесты
- 13. Развёртывание и масштабирование
- 14. Checklists и примеры вызовов
- 15. Словарь терминов и FAQ

1. Общая архитектура (высокоуровневая, точная)
- API Gateway (Express/Next.js API) — входной пункт для клиентов/UI/CLI, предоставляет REST/GraphQL endpoints для создания задач synth/mastering/render.
- Orchestrator / Backend Service (TypeScript, Node.js) — создает task сущности, валидация, сохраняет метаданные в Postgres, публикует сообщение в очередь (Redis Stream или RabbitMQ).
- Queue: Redis Streams (рекомендуем) или RabbitMQ — гарантия доставки, поддержка leasing/ack.
- Agent Pool (TypeScript workers) — набор идентичных воркеров (docker image), соединяется с очередью и обрабатывает задания. Каждый агент:
  - читает задания
  - резервирует/claim с lease
  - выполняет pipeline: preprocess -> synth (Suno) -> postprocess -> encode -> store -> notify
- Storage: S3-compatible (AWS S3 или MinIO)
- DB: Postgres — хранит tasks, artifacts, events, users
- Cache/Short-term: Redis — lease, caching, rate limiting
- Observability: Prometheus (metrics), Grafana (dashboards), Loki/Elk (logs), OpenTelemetry (tracing)
- Secrets: Vault or cloud provider secrets manager
- CI: GitHub Actions — lint, unit tests, integration tests, build, push docker image
- Infra: Terraform/Kubernetes manifests (Helm) для деплоя

2. Компоненты и структура кода (рекомендованная и ожидаемая)
Проект основан на TypeScript — структура каталогов должна быть детализирована и строгой:

- /packages
  - /api — API gateway / REST endpoints (Next.js API или Express)
  - /orchestrator — сервис создания тасков и управления
  - /agents
    - /worker-core — общий runtime агента, claim, backoff, metrics
    - /agent-synth — специфичный загружатель и pipeline для synth tasks
    - /agent-mastering — pipeline мастеринга
  - /suno — интеграционный адаптер (suno client)
  - /lib
    - /db — Postgres models, migrations
    - /storage — S3 wrapper
    - /queue — Redis Streams or RabbitMQ wrapper
    - /utils — logging, backoff, idempotency
  - /scripts — dev helpers, fixtures
  - /infra — k8s manifests, helm charts
  - /tests — unit/integration/e2e
- /docker-compose.yml — локальная dev stack (minio, postgres, redis, fake-suno)
- /README.md, /AGENT.md (this file)

3. Статическая модель данных — Postgres
Таблицы (DDL — скелет):

- tasks
  - id UUID PRIMARY KEY
  - type TEXT NOT NULL CHECK (type IN ('synthesize_vocal','mastering','render_backing','preview'))
  - status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','in-progress','completed','failed','cancelled'))
  - user_id UUID
  - params JSONB
  - priority SMALLINT DEFAULT 50
  - lease_owner TEXT NULL
  - lease_expires_at TIMESTAMP NULL
  - created_at TIMESTAMP DEFAULT now()
  - updated_at TIMESTAMP DEFAULT now()
  - last_error JSONB NULL
  - attempt_count INT DEFAULT 0
  - origin TEXT NULL
  - callback_url TEXT NULL
  - idempotency_key TEXT NULL UNIQUE (nullable) — optional, used for dedupe

- artifacts
  - id UUID
  - task_id UUID REFERENCES tasks(id) ON DELETE CASCADE
  - type TEXT (stereo_mix / stems_zip / preview / raw_suno)
  - storage_key TEXT
  - url TEXT
  - size_bytes BIGINT
  - metadata JSONB
  - created_at TIMESTAMP DEFAULT now()

- events (audit log)
  - id UUID
  - task_id UUID
  - level TEXT
  - message TEXT
  - meta JSONB
  - created_at TIMESTAMP

- users, voices, presets — domain tables

Indexes:
- tasks (status, priority, lease_expires_at)
- tasks (idempotency_key) unique partial index where idempotency_key IS NOT NULL

4. Рабочий пайплайн агента — детально (sequence)
1) Poll / subscribe queue:
   - Agents используют Redis Streams XREADGROUP или RabbitMQ consumer with ack.
   - Lease semantics: когда агент берет task, он устанавливает lease_owner=agent_id и lease_expires_at = now() + lease_ttl (например 10 минут).
2) Validation:
   - validate_task_schema(params)
   - Check sample_rate in allowed set [22050, 44100, 48000, 96000]
   - Check format in permitted formats ['wav','flac','mp3']
   - Size & length limits (text chars <= 20000, total audio assets size <= configured)
3) Claim:
   - Atomically set lease fields via UPDATE ... WHERE id = $id AND (lease_owner IS NULL OR lease_expires_at < now())
   - If success, proceed; otherwise ack=reject and requeue.
4) Plan:
   - plan generated with steps array:
     - step 0: fetch_assets
     - step 1: preprocess (tempo detect, resample)
     - step 2: synthesize via Suno (main step)
     - step 3: postprocess (denoise, de-esser)
     - step 4: mix & export stems
     - step 5: encode
     - step 6: upload artifacts
     - step 7: notify callback
5) Execution per step with idempotency:
   - Each step must persist a step marker in DB: task_steps table or in task.meta
   - If worker restarts, it resumes from the first incomplete step.
6) Suno call:
   - call_suno_synthesize with payload and idempotency_key.
   - Support both immediate binary return and async job-with-callback.
7) Postprocessing:
   - Use ffmpeg/sox or WASM DSP for CPU light tasks; for high-quality use native libs in container with enough CPU/RAM.
8) Upload:
   - Use storage.store_asset(bucket, key, filePath) returning signed URL.
   - Key schema: <env>/artifacts/<year>/<month>/<day>/<task_id>/<artifact_type>.<ext>
9) Notification:
   - POST to callback_url with HMAC signature header X-Hub-Signature: sha256=...
   - Save event in events table and update task.status = 'completed' or 'failed'
10) Cleanup:
   - Remove temporary files immediately or keep up to retention TTL for debug (configurable).

5. Контракты: JSON схемы задач/результатов
Task request schema (task creation request body — API):

```json
{
  "type": "synthesize_vocal",
  "user_id": "uuid",
  "params": {
    "text": "string (required for synthesize_vocal)",
    "voice": { "id": "string", "preset": "albert-classic", "model": "suno-vX" },
    "style": "calm|energetic|aggressive|soft",
    "language": "ru",
    "temperature": 0.0,
    "sample_rate": 48000,
    "format": "wav",
    "stems": true,
    "alignment": { "enable": true, "strategy": "phoneme" },
    "lyrics_timestamps": false
  },
  "assets": [
    { "name": "backing", "url": "s3://bucket/path/track.mp3", "start_offset_ms": 0 }
  ],
  "callback_url": "https://client.example/callback",
  "idempotency_key": "sha256(...)",
  "priority": 50,
  "meta": { "origin": "web-ui" }
}
```

Task result schema (callback payload on completion):

```json
{
  "task_id": "uuid",
  "status": "completed",
  "artifacts": [
    {
      "type": "stereo_mix",
      "url": "https://cdn.example/artifacts/..",
      "storage_key": "prod/artifacts/2025/10/09/<id>/mix.wav",
      "size_bytes": 1234567,
      "sample_rate": 48000,
      "duration_ms": 180000
    }
  ],
  "metrics": {
    "synthesis_time_ms": 5000,
    "postprocess_time_ms": 2000,
    "total_cpu_seconds": 12.3
  },
  "logs_url": "https://logs.example/task/<id>",
  "errors": []
}
```

Standard error object:

```json
{
  "code": "INVALID_PARAM|RATE_LIMIT|SUNO_ERROR|STORAGE_ERROR|INTERNAL",
  "message": "detailed human readable message",
  "details": { "field": "params.voice" }
}
```

6. Полная интеграция с Suno (sunoapi.org) — Adapter contract и примеры
Общая идея: весь внешний вызов Suno инкапсулирован в /packages/suno (SunoAdapter). Это адаптер-«обертка», единственная точка обращения к внешнему API. Принципы:
- Экспортировать строго типизированный интерфейс.
- Поддержка idempotency key.
- Поддержка both synchronous (return audio immediately) and asynchronous (job_id + webhook) modes.
- Retry и rate-limit handling в адаптере.

Конфигурация (env):
- SUNO_API_KEY
- SUNO_BASE_URL (например https://api.sunoapi.org/v1)
- SUNO_TIMEOUT_MS (60000)
- SUNO_MAX_RETRIES (5)
- SUNO_MAX_CONCURRENCY (4)
- SUNO_USE_WEBHOOKS (boolean)
- SUNO_WEBHOOK_SECRET (if registering callbacks)

Типичный Suno synthesis request (пример JSON, реальная схема может отличаться — адаптер нормализует):

POST {SUNO_BASE_URL}/synth
Headers:
  Authorization: Bearer {SUNO_API_KEY}
  Content-Type: application/json
Body:
```json
{
  "idempotency_key": "task-uuid-step-synth",
  "voice": "albert-classic",
  "input": {
    "type": "text",
    "text": "Привет, это тест"
  },
  "format": "wav",
  "sample_rate": 48000,
  "quality": "high",
  "return_stems": true,
  "callback_url": "https://orchestrator.example/suno/webhook?task_id=<task>"
}
```

Возможные типы ответов от Suno (нормализованные адаптером):
- 200 OK synchronous
  - body: { "status":"completed", "audio_url":"https://s3.../result.wav", "stems_url":"..." }
- 202 Accepted async
  - body: { "status":"pending", "job_id":"suno-job-123", "eta_seconds":30 }
- 4xx
  - body: { "error": { "code":"invalid_voice", "message":"Voice not found" } }
- 429
  - body: { "error": "rate_limited", "retry_after": 15 }
- 5xx
  - transient server error

SunoAdapter должeн:
- Проверять retry-after header при 429
- Реализовать token-bucket локальный rate limiter (max concurrent requests configurable)
- Поддерживать streaming загрузку/скачивание (progress callback)
- Поддерживать подпись webhook если Suno позволяет регистрировать callback_url with secret

SunoAdapter интерфейс TypeScript (recommended):

```ts
export interface SunoAdapter {
  synth(payload: SunoSynthesisPayload): Promise<SunoSynthesisResponse>;
  getJobStatus(jobId: string): Promise<SunoJobStatus>;
  listVoices(): Promise<SunoVoiceInfo[]>;
  createCustomVoice(def: CustomVoiceDef): Promise<CustomVoiceResponse>;
  uploadSample(samplePath: string): Promise<SunoUploadResponse>;
}
```

Пример response типов:

```ts
type SunoSynthesisResponse =
  | { status: 'completed'; audio_url: string; stems_url?: string; meta?: any }
  | { status: 'pending'; job_id: string; eta_seconds?: number }
  | { status: 'failed'; error: SunoError };

interface SunoError { code: string; message: string; details?: any; }
```

Error handling model:
- 4xx (input errors) => map to Task failed with code INVALID_PARAM
- 429 => use retry-after header; implement exponential backoff with jitter
- 5xx => retry up to SUNO_MAX_RETRIES then mark as transient failure
- Network timeouts => retry

7. Интерфейсы и API агента (TypeScript сигнатуры + skeletons)
Ниже — набор обязательных модулей и функций, с конкретным TypeScript кодом-скелетом для немедленного использования/реализации.

Файл: /packages/agents/worker-core/src/agent.ts

```ts
export type AgentConfig = {
  agentId: string;
  concurrency: number;
  tempDir: string;
  s3Bucket: string;
  sunoApiKey: string;
  sunoBaseUrl: string;
  dbUrl: string;
  queueUrl: string;
  redisUrl?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  leaseTtlSeconds?: number;
  retainTempFilesSeconds?: number;
};

export class Agent {
  constructor(private cfg: AgentConfig) {}
  async init(): Promise<void> {
    // connect to DB, queue, S3, and Suno adapter
  }
  async startLoop(): Promise<void> {
    // main polling loop: fetch -> claim -> run -> report
  }
  async shutdown(graceful = true): Promise<void> {
    // stop loop and optionally requeue tasks
  }
}
```

Core utility: backoff + retry

```ts
export async function backoffRetry<T>(
  fn: () => Promise<T>,
  attempts = 5,
  baseMs = 300,
  multiplier = 2,
  jitter = true
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= attempts) throw err;
      let delay = baseMs * Math.pow(multiplier, attempt - 1);
      if (jitter) delay = Math.round(delay * (0.5 + Math.random() * 0.5));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
```

Task claim (atomic):

```ts
async function claimTask(db: PgClient, taskId: string, agentId: string, leaseSeconds: number) {
  const res = await db.query(
    `UPDATE tasks
     SET lease_owner = $1, lease_expires_at = NOW() + ($2 || ' seconds')::interval, status = 'in-progress', updated_at = now()
     WHERE id = $3
       AND (lease_owner IS NULL OR lease_expires_at < now())
     RETURNING *`,
    [agentId, leaseSeconds, taskId]
  );
  return res.rowCount === 1 ? res.rows[0] : null;
}
```

Suno adapter usage inside worker:

```ts
const suno = new SunoAdapter({ baseUrl: cfg.sunoBaseUrl, apiKey: cfg.sunoApiKey });
const synthResult = await suno.synth({
  idempotency_key: `${task.id}:synth`,
  voice: params.voice.preset ?? 'albert-classic',
  input: { type: 'text', text: params.text },
  format: params.format ?? 'wav',
  sample_rate: params.sample_rate ?? 48000,
  return_stems: params.stems === true,
  callback_url: `${cfg.orchestratorBase}/suno/webhook?task_id=${task.id}`,
});
```

Post-processing pipeline (example skeleton):

```ts
async function processAudioPipeline(localFiles: string[], plan: PlannedSteps) {
  // 1. Resample: ffmpeg -i in.wav -ar sample_rate out_resampled.wav
  // 2. Normalize: loudnorm or sox gain
  // 3. Remove silence, trim, align with backing
  // 4. Stems splitting with spleeter (if allowed) or using Suno output
  // 5. Mix stems
  // 6. Export final files
}
```

Storage helper:

```ts
async function storeAsset(s3: S3Client, bucket: string, key: string, filePath: string) {
  // check if key exists -> skip upload for idempotency
  // upload and return signed URL
}
```

Callback notify:

```ts
async function notifyCallback(callbackUrl: string, payload: any, hmacSecret?: string) {
  const body = JSON.stringify(payload);
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (hmacSecret) {
    const sig = createHmac('sha256', hmacSecret).update(body).digest('hex');
    headers['X-Hub-Signature-256'] = `sha256=${sig}`;
  }
  return await fetch(callbackUrl, { method: 'POST', body, headers, timeout: 5000 });
}
```

8. Сторонние интеграции — требования и рекомендации
- S3 / MinIO:
  - Use putObject with content-type and metadata.
  - Use presigned URLs for client downloads (expiring).
  - Key naming convention: env/artifacts/YYYY/MM/DD/<task-id>/<artifact-type>.<ext>
- Redis:
  - Use Redis Streams for queue and consumer groups for multiple agents.
  - Use Redis for lease heartbeats and short-term cache.
- RabbitMQ:
  - If used, employ durable queues and manual ack.
- Postgres:
  - Use transactions for state transitions (claim, update attempts).
  - Use advisory locks only if needed for cross-worker coordination.
- Optional: Object scanning (virus/malware) if uploading user-provided assets.

9. Надёжность: retry, idempotency, транзакции
- Idempotency:
  - All external side-effects must be guarded by idempotency-key (task_id + step_name).
  - Before Suno call, adapter checks if a result for idempotency_key exists in cache/DB.
  - Before upload, check if storage key exists.
- Retries:
  - Use exponential backoff with capped attempts.
  - For 429, respect Retry-After header, backoff with jitter.
  - For Suno 5xx and network errors, retry up to SUNO_MAX_RETRIES.
- Transactional claim:
  - Use SQL UPDATE ... RETURNING to atomically claim tasks.
- Leases & visibility:
  - Agents must periodically heartbeat to extend lease if long-running.
  - If agent crashes, lease expires and another agent can pick up.
- Dead-letter:
  - After max_attempts (configurable, default 5), move task to dead-letter queue and mark failed; optionally notify staff.

10. Безопасность и секреты
- Never log secrets (SUNO_API_KEY, AWS_SECRET, HMAC_SECRET).
- Callbacks signed with HMAC-SHA256 and X-Hub-Signature-256 header.
- Storage access via IAM roles or pre-signed URLs; limit bucket permissions.
- Validate callback_url domain whitelist to avoid SSRF.
- Input validation at API gateway layer (lengths, allowed values).
- Rotate keys periodically and support multiple active keys during rotation.

HMAC example:

```ts
function signPayload(hmacSecret: string, payload: string): string {
  return `sha256=${createHmac('sha256', hmacSecret).update(payload).digest('hex')}`;
}
```

11. Observability: логирование, метрики, tracing
- Logging:
  - JSON structured logs with fields:
    { ts, level, agent_id, task_id, step, message, duration_ms, error_code, error_message }
- Metrics (Prometheus):
  - agent_tasks_processed_total{agent_id}
  - agent_tasks_failed_total{agent_id, reason}
  - suno_requests_total{status}
  - suno_request_latency_seconds_bucket
  - s3_upload_latency_seconds
  - active_agents
- Tracing:
  - Propagate trace_id across calls (API -> orchestrator -> agent -> suno -> storage)
  - Use OpenTelemetry and export to collector
- Alerts:
  - Increase in failed tasks / 5xx from Suno / queue backlog growth / high latencies

12. CI/CD, локальная разработка и тесты
- GitHub Actions workflow:
  - lint (eslint), typecheck (tsc), unit tests (jest), build (docker build), push image on merge, run integration tests with docker-compose (MinIO, Postgres, Redis, Fake Suno)
- Local dev:
  - docker-compose.yml with services:
    - postgres:13
    - redis
    - minio (console)
    - fake-suno (simple express server that simulates Suno responses)
  - .env.example provided
- Tests:
  - Unit tests for utils and Suno adapter (mock http)
  - Integration tests for pipeline with fake-suno and minio endpoint
  - E2E: simulate task creation, poll artifact existence, verify callback signature

13. Развёртывание и масштабирование
- Run agent as Deployment in Kubernetes:
  - HPA based on cpu or queue backlog (custom metric)
  - Pod resources: request & limit per agent process (e.g., 2 vCPU, 4GB RAM baseline)
- Suno concurrency:
  - Global SUNO_MAX_CONCURRENCY env to throttle outbound requests
  - Per-node concurrency: agent concurrency setting
- Blue/Green or Canary for updates
- Use rolling restarts; drain producer before pod termination: set preStop hook to finish current task or extend lease until safe.

14. Checklists и примеры вызовов (конкретные)
API Create Task example (HTTP):

POST /api/tasks
Headers:
  Authorization: Bearer <JWT>
Body:
```json
{
  "type": "synthesize_vocal",
  "user_id": "user-123",
  "params": {
    "text": "Привет от Albert3!",
    "voice": { "preset": "albert-classic", "model": "suno-v1" },
    "language": "ru",
    "sample_rate": 48000,
    "format": "wav",
    "stems": true
  },
  "callback_url": "https://client.example/api/task-callback",
  "idempotency_key": "user-123:hash_of_payload"
}
```

Expected system flow:
- API creates row in tasks (status queued), returns 202 with task_id.
- Orchestrator publishes to queue.
- Agent picks task, claims, sets status in-progress.
- Agent calls SunoAdapter.synth with idempotency_key.
- On Suno completion, agent downloads result (if needed), postprocesses, stores artifacts, updates artifacts table.
- Agent POST callback to client callback_url with HMAC header.
- Agent sets task.status = completed.

15. Словарь терминов и FAQ
- Agent — background worker that processes tasks.
- Task — single unit of work (synthesis, mastering, rendering).
- Lease — temporary exclusive ownership marker for a task.
- Idempotency key — unique identifier to prevent duplicated side-effects.
- SunoAdapter — module that encapsulates all communication with sunoapi.org.

FAQ (кратко):
- Q: Как обрабатывать долгие synth-задания?  
  A: Использовать асинхронный режим Suno (job_id + callback/webhook) и heartbeat для продления lease; если нет webhook, агентов опрашивают статус job через getJobStatus.
- Q: Нужно ли транскрибировать голос?  
  A: Если требуется timestamps для lyrics/DAW alignment, запускается отдельный шаг с ASR engine (VOSK/Whisper).
- Q: Как обеспечить согласованность при множественном запуске агента?  
  A: Atomic claim через DB (UPDATE ... WHERE ...) и Redis streams consumer groups.

16. ToDo / Рекомендации для внедрения (конкретные задачи)
- Реализовать /packages/suno/adapter.ts с полным обработчиком 200/202/429/5xx, поддержкой idempotency.
- Добавить DB migration для tasks/artifacts/events (SQL files в /packages/lib/db/migrations).
- Добавить E2E tests с fake-suno в /tests/e2e.
- Внедрить structured logging и OpenTelemetry tracing hook в agent-core.
- Создать helm chart для agent deployment с конфигурацией concurrency.

17. Полный пример TypeScript модуля SunoAdapter (skeleton)

```ts
// packages/suno/src/adapter.ts
import fetch from 'node-fetch';
import { backoffRetry } from '../utils/backoff';

export type SunoConfig = { baseUrl: string; apiKey: string; timeoutMs: number; maxRetries: number; };

export class SunoAdapter {
  constructor(private cfg: SunoConfig) {}
  async synth(payload: any): Promise<any> {
    return backoffRetry(async () => {
      const res = await fetch(`${this.cfg.baseUrl}/synth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        timeout: this.cfg.timeoutMs
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 200) return { status: 'completed', body };
      if (res.status === 202) return { status: 'pending', body };
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after')||'0',10);
        const err: any = new Error('Rate limited');
        (err as any).retryAfter = retryAfter;
        throw err;
      }
      if (res.status >= 500) throw new Error('Suno server error');
      // map 4xx to domain errors
      throw Object.assign(new Error('Suno error'), { code: body?.error?.code, message: body?.error?.message, status: res.status });
    }, this.cfg.maxRetries, 300, 2);
  }
}
```

18. Debugging и поддержка
- Для локального debug включите LOG_LEVEL=debug, set TEMP_DIR to persistent folder, and keep retainTempFilesSeconds high.
- Для анализа проблем сохраняйте last N temp files into s3 under debug/<task-id>
- Expose /health and /metrics endpoints on agent port.

19. Контроль версий моделей и воспроизводимость
- В task.params всегда фиксируйте model_version (например suno:v1.2.3).
- В metadata записывать adapter version, agent docker image sha, Node.js version.

20. Legal / compliance (коротко)
- Проверять лицензию Suno API на коммерческое использование.
- Обеспечить пользовательское согласие и хранение копий исходного аудио при необходимости.

Завершающие замечания
- Этот AGENT.md — детальная и практически применимая спецификация для полной разработки и поддержки агентов в проекте albert3-muse-synth-studio. Реализация должна следовать принципам идемпотентности, наблюдаемости и безопасности.
- Если требуются код-ревью конкретных файлов из репозитория или генерация scaffold файлов (TypeScript impl, migrations, docker-compose), укажите точнее какие файлы желаете сгенерировать; я создам их в виде patch/PR-ready файлов.
