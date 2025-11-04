# Чек-лист технического аудита (Workspace)

## Структура и архитектура
- [ ] Компоненты следуют SOLID и DRY
- [ ] Чёткое разделение слоёв (UI/State/Data/Services)
- [ ] SSOT для типов и моделей провайдеров

## Типизация и линтинг
- [ ] `strict` режим включён, `noImplicitAny` соблюдается
- [ ] Нет неиспользуемых переменных/параметров
- [ ] ESLint покрывает `src` и документацию (markdown)

## Хуки и производительность
- [ ] Мемоизация селекторов Zustand и вычислений
- [ ] Контроль подписок/отписок каналов Supabase
- [ ] Настроены `staleTime`/`cacheTime` в React Query
- [ ] Метрики `web-vitals` собираются

## Обработка ошибок
- [ ] Единый `ErrorBoundary` на уровне приложения
- [ ] Централизованный логгер (без `console.*` в проде)
- [ ] `retryWithBackoff` для нестабильных API
- [ ] Graceful fallback UI на отказ провайдеров

## Интеграции и безопасность
- [ ] JWT валидация на Edge функциях
- [ ] RLS политики проверены
- [ ] «Leaked Password Protection» включена
- [ ] PII не логируется клиентом

## SEO, PWA, a11y
- [ ] Meta-теги: title, description, OG/Twitter
- [ ] `canonical` и JSON-LD
- [ ] PWA manifest и Service Worker корректны
- [ ] Landmark roles и skip-link
- [ ] Axe-проверки на ключевых страницах

## CI/CD и деплой
- [ ] CI: lint → typecheck → unit-tests → build
- [ ] Required Status Checks включены
- [ ] E2E и Lighthouse (по возможности)
- [ ] Blue-Green + rollback сценарии

## Документация
- [ ] README и деплой-гайды актуальны
- [ ] API reference обновлён
- [ ] Отчёт аудита и метрики до/после сохранены