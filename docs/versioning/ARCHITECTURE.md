# Архитектура модуля версий треков

Слои:
- UI: `TrackVariantSelector`, `TrackVersions`, `MinimalVersionsList` — отображение и управление версиями.
- Hooks: `useTrackVersions`, `useSmartTrackPlay`, `useVersionNavigation`, `useTrackRollback` — загрузка, кэш, навигация, откат.
- API: `src/features/tracks/api/trackVersions.ts` — создание/обновление/удаление версий, установка мастер‑версии.
- Store: `useAudioPlayerStore` — состояние проигрывателя, текущая версия.
- Tests: Vitest + Testing Library — `tests/unit/components/TrackVariantSelector.test.tsx` и другие.

Структура данных:
- `tracks` — основная запись трека (основная версия).
- `track_versions` — варианты. Важные поля: `parent_track_id`, `sourceVersionNumber`, `is_preferred_variant`.

Индексы БД (рекомендации):
- `idx_track_versions_parent` на `parent_track_id`
- `idx_track_versions_preferred` на `is_preferred_variant`
- `idx_track_versions_variant_index` на `sourceVersionNumber`

Кэш и подписки:
- `useTrackVersions` хранит кэш версий и подписчики; предоставляет `subscribeToTrackVersions`, `invalidateTrackVersionsCache`, `fetchTrackVersions`.
- После `setMasterVersion` обязательно инвалидировать кэш, чтобы UI обновился.

Диаграмма компонентов:

```mermaid
graph LR
  A[TrackVariantSelector] -->|onVersionChange| B[useAudioPlayerStore]
  A --> H[useTrackVersions]
  H --> API[trackVersions.ts]
  API --> DB[(tracks, track_versions)]
  A --> T[useToast]
  B --> P[Плеер]
  H --> Cache[Кэш версий]
```

Последовательность установки мастер‑версии — транзакционный план:

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as API Layer
  participant SQL as DB

  FE->>API: setMasterVersion(versionId)
  API->>SQL: BEGIN TRANSACTION
  API->>SQL: UPDATE track_versions SET is_preferred_variant=false WHERE parent_track_id=:parent
  API->>SQL: UPDATE track_versions SET is_preferred_variant=true WHERE id=:versionId
  SQL-->>API: COMMIT
  API-->>FE: 200 OK + обновлённые версии
  FE->>FE: invalidate cache + optimistic UI
```

Обработка ошибок:
- Тосты с подробностями.
- Логирование `logError` и `TrackOperationsLogger`.
- Возврат к предыдущему состоянию при неудаче (оптимистический откат).