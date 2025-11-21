# API Integration Audit

## Инвентаризация
- Supabase: Auth/DB/Storage/Edge Functions.
- Suno API: генерация музыки, лирики, обложек, видео, конверсия WAV, разделение вокала.

## Suno API — лучшие практики
- Callback Security: IP whitelist, HTTPS-only, валидация запроса, таймауты (см. «Generate Music Cover», «Callback Security»).
- Стриминг и высокая конкуррентность (Quick Start: High-Concurrency Architecture).
- Этапы callback: text/first/complete; поддержка polling (Quick Start Developer Notes).

## Проверки
- Валидация схем: тело callback → ожидаемые поля (taskId, status, urls).
- Ретраи и таймауты: экспоненциальный backoff, fallback polling.
- Конфигурация SSL/TLS.

## Результаты (TBD)
| Проверка | API | Статус | Рекомендация |
|---|---|---|---|
| Callback Security | Suno | TBD | Внедрить IP whitelist/HTTPS-only |
| Polling Fallback | Suno | TBD | Использовать «Get Details» эндпоинты |
| Rate-limit | Supabase Edge | TBD | Проверить `rate-limit.ts` |

## Ссылки на код
- `supabase/functions/_shared/storage.ts:246–276` — upload covers (ретраи/таймауты).
- `supabase/functions/_shared/rate-limit.ts` — лимитирование запросов.