# Список измененных файлов

## Backend

- `supabase/functions/_shared/suno.ts`: Рефакторинг основного файла API-клиента Suno.
- `supabase/functions/_shared/suno-utils.ts`: (Новый) Утилиты для API Suno.
- `supabase/functions/_shared/suno-types.ts`: (Новый) Типы для API Suno.
- `supabase/functions/_shared/suno-constants.ts`: (Новый) Константы для API Suno.
- `supabase/functions/_shared/suno-logic-generate.ts`: (Новый) Логика для генерации музыки.
- `supabase/functions/_shared/suno-logic-lyrics.ts`: (Новый) Логика для получения текстов песен.
- `supabase/functions/_shared/suno-logic-stems.ts`: (Новый) Логика для получения стемов.
- `supabase/functions/_shared/suno-logic-wav.ts`: (Новый) Логика для получения wav файлов.
- `supabase/functions/tests/suno-v3-api.test.ts`: Модифицированы тесты для соответствия новой структуре.
- `supabase/functions/generate-suno/index.ts`: Обновлен для использования нового клиента Suno.
- `supabase/functions/get-lyrics/index.ts`: Обновлен для использования нового клиента Suno.
- `supabase/functions/suno-callback/index.ts`: Обновлен для использования нового клиента Suno.

## Frontend

### Глобальный плеер (рефакторинг)

- `src/stores/audioPlayerStore.ts`: Масштабный рефакторинг с использованием "slice" паттерна.
- `src/stores/playbackSlice.ts`: (Новый) Slice для управления состоянием воспроизведения.
- `src/stores/queueSlice.ts`: (Новый) Slice для управления очередью треков.
- `src/stores/versionSlice.ts`: (Новый) Slice для управления версиями треков.
- `src/features/tracks/api/useTrackVersions.ts`: (Новый) Хук для загрузки версий трека, выделен из `audioPlayerStore`.
- `src/components/player/AudioController.tsx`: Адаптирован под новый стор и восстановлена логика отказоустойчивости.
- `src/components/player/DesktopPlayerLayout.tsx`: Адаптирован под новый стор.
- `src/components/player/PlaybackControls.tsx`: Адаптирован под новый стор.
- `src/hooks/useVersionNavigation.ts`: Адаптирован под новый стор.
- `src/components/player/buttons/PlayPauseButton.tsx`: Адаптирован под новый стор.

### UI и компоненты (исправления)

- `src/components/tracks/TrackDetails.tsx`: Исправлено отображение метаданных и форматирование дат.
- `src/components/tracks/shared/useTrackMenuItems.tsx`: Исправлены критические ошибки, приводящие к падению приложения при вызове контекстного меню.
- `src/components/player/LyricsDisplay.tsx`: Восстановлена работоспособность отображения текста песни.
- `src/features/tracks/components/card/TrackCard.tsx`: Исправлена ошибка, из-за которой пропадала кнопка "сделать мастер-версией".
