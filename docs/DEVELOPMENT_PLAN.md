# 🚀 План разработки Albert3 Muse Synth Studio

## 📋 Текущий статус

**Текущий спринт**: Sprint 18 (Performance & Security)  
**Прогресс**: 60% завершено  
**Следующий спринт**: Sprint 19 (UX Excellence & AI Content Quality)

---

## 🎯 Sprint 19: UX Excellence & AI Content Quality

### Общая цель
Кардинально улучшить пользовательский опыт и качество AI контента через систему подсказок, расширенный редактор лирики и 70+ музыкальных стилей.

### Неделя 1: Критические исправления (26 часов)

#### ⚡ UX-001: Исправление AI функций (8 часов)
**Файлы для изменения:**
- `supabase/functions/generate-lyrics/index.ts`
- `supabase/functions/improve-prompt/index.ts`
- `supabase/functions/suggest-styles/index.ts`

**Задачи:**
- [ ] Исправить API endpoint в generate-lyrics на `https://ai.gateway.lovable.dev/v1/chat/completions`
- [ ] Улучшить system prompts для более креативных результатов
- [ ] Добавить structured output через tool calling в suggest-styles
- [ ] Протестировать все AI endpoints

**Критерии приемки:**
- ✅ Все AI функции возвращают корректные ответы
- ✅ Время ответа < 5 секунд
- ✅ Обработка ошибок с понятными сообщениями
- ✅ Unit тесты для каждого endpoint

---

#### 🎯 UX-002: Реализация функций Library (6 часов)
**Файл:** `src/pages/workspace/Library.tsx`

**Задачи:**
- [ ] Реализовать `handleLike(trackId)` с интеграцией likes.service.ts
- [ ] Реализовать `handleDownload(trackId)` с загрузкой из Supabase Storage
- [ ] Реализовать `handleShare(trackId)` с генерацией публичной ссылки
- [ ] Добавить loading states и toast уведомления

**Критерии приемки:**
- ✅ Like/Unlike работает мгновенно
- ✅ Download корректно загружает аудио
- ✅ Share генерирует публичную ссылку
- ✅ Все действия имеют loading индикаторы

---

#### 💡 UX-003: Система Tooltips Часть 1 (12 часов)
**Компоненты:**
- `src/components/MusicGenerator.tsx` - 20 tooltips
- `src/components/workspace/DetailPanel.tsx` - 15 tooltips
- `src/components/player/GlobalAudioPlayer.tsx` - 10 tooltips
- `src/components/player/MiniPlayer.tsx` - 5 tooltips

**Критерии приемки:**
- ✅ 50+ tooltips добавлено
- ✅ Тексты понятны русскоязычным пользователям
- ✅ Задержка появления 500ms
- ✅ Адаптивность для мобильных

---

### Неделя 2: AI контент улучшения (30 часов)

#### 📝 AI-001: Расширенный редактор лирики (16 часов)

**Новая структура:**
```
<Tabs>
  - AI Генерация
    - Язык (ru/en)
    - Структура песни (Intro/Verse/Chorus/Bridge/Outro)
    - Вокальный стиль (Male/Female/Duet/Choir)
    - Референсы (опционально)
    - Тема/настроение
    - Кнопка "Улучшить с AI"
  - Ручной ввод
    - Textarea с форматированием
    - Счетчик строк/символов
    - Preview режим
</Tabs>
```

**Новые файлы:**
- `supabase/functions/improve-lyrics/index.ts` - Edge Function

**Изменяемые файлы:**
- `src/components/LyricsEditor.tsx` - полная переработка

**Критерии приемки:**
- ✅ 2 режима работают корректно
- ✅ Все поля валидируются
- ✅ Улучшение существующей лирики работает
- ✅ Поддержка русского и английского
- ✅ UI адаптивен

---

#### 🎨 AI-002: Расширенная система стилей (14 часов)

**Структура 70+ стилей:**

```typescript
8 категорий:
├── 🎹 Электроника (10 стилей)
├── 🎸 Рок (10 стилей)
├── 🎤 Поп (9 стилей)
├── 🎧 Хип-хоп (9 стилей)
├── 🎺 Джаз и Блюз (9 стилей)
├── 🎻 Классика (8 стилей)
├── 🌍 Мировая музыка (9 стилей)
└── 🔬 Экспериментальная (8 стилей)
```

**Файл:** `src/components/MusicGenerator.tsx`

**Дополнительные функции:**
- [ ] Поиск по стилям
- [ ] История последних 10 использованных (localStorage)
- [ ] AI рекомендации похожих стилей
- [ ] Preset комбинации стилей

**Критерии приемки:**
- ✅ 70+ стилей в 8 категориях
- ✅ Поиск работает мгновенно
- ✅ История сохраняется
- ✅ AI рекомендации релевантны

---

### Неделя 3: Производительность (24 часа)

#### 📊 PERF-002: Централизованное логирование (8 часов)

**Задачи:**
- [ ] Найти все 69+ использований `console.*`
- [ ] Заменить на `logger.info/error/warn/debug`
- [ ] Добавить контекст к логам
- [ ] Настроить отправку критических ошибок

**Файлы (частично):**
- src/hooks/useTracks.ts
- src/hooks/useMusicGeneration.ts
- src/services/*.service.ts
- src/components/MusicGenerator.tsx

**Критерии приемки:**
- ✅ 0 использований console.* в production
- ✅ Все логи структурированы (JSON)
- ✅ Критические ошибки отправляются на сервер

---

#### ⚡ PERF-003: Мемоизация компонентов (10 часов)

**Компоненты:**
- [ ] TrackCard - React.memo + useMemo
- [ ] TrackListItem - React.memo + useCallback
- [ ] MiniPlayer - React.memo
- [ ] PlayerQueue - React.memo для элементов

**Критерии приемки:**
- ✅ Re-renders сокращены на 60%+
- ✅ FPS в списках стабильные 60
- ✅ React DevTools Profiler показывает улучшения

---

#### 🔧 PERF-004: Оптимизация API (6 часов)

**Задачи:**
- [ ] Экспоненциальный backoff для polling
- [ ] Database indexes (tracks, likes)
- [ ] React Query optimization (staleTime, cacheTime)
- [ ] Optimistic updates для like/unlike

**SQL миграции:**
```sql
CREATE INDEX idx_tracks_user_created ON tracks(user_id, created_at DESC);
CREATE INDEX idx_tracks_status ON tracks(status) WHERE status != 'completed';
CREATE INDEX idx_track_likes_user_track ON track_likes(user_id, track_id);
```

---

### Неделя 4: Технический долг (24 часа)

#### 🔧 TECH-001: useTrackOperations хук (8 часов)

**Новый файл:** `src/hooks/useTrackOperations.ts`

**Функции:**
```typescript
interface UseTrackOperationsReturn {
  deleteTrack: (id: string) => Promise<void>;
  togglePublic: (id: string, isPublic: boolean) => Promise<void>;
  downloadTrack: (id: string) => Promise<void>;
  shareTrack: (id: string) => Promise<string>;
  likeTrack: (id: string) => Promise<void>;
  unlikeTrack: (id: string) => Promise<void>;
  // Loading states для каждой операции
}
```

**Использование в:**
- Library.tsx
- DetailPanel.tsx
- TrackCard.tsx
- TrackListItem.tsx

**Критерии приемки:**
- ✅ Дублированный код сокращен на 60%
- ✅ 100% test coverage
- ✅ Типобезопасность

---

#### 🧪 TEST-001: E2E тестирование (12 часов)

**Setup:**
- Playwright installation и configuration
- CI/CD интеграция

**Критические flows:**
1. Auth Flow (2 часа)
2. Music Generation Flow (3 часа)
3. Playback Flow (2 часа)
4. Library Management (2 часа)
5. Stems Separation (3 часа)

**Критерии приемки:**
- ✅ 5 критических flows покрыты
- ✅ Screenshot comparison для UI
- ✅ Performance assertions
- ✅ CI/CD интеграция

---

#### 🔍 AUDIT-001: Suno API аудит (4 часа)

**Задачи:**
- [ ] Проверить актуальность endpoints
- [ ] Проверить формат ответов
- [ ] Проверить rate limits
- [ ] Обновить типы и документацию

**Файлы:**
- src/types/track.ts
- docs/api/API.md

---

## 📊 Метрики успеха Sprint 19

### Пользовательский опыт

| Метрика | Сейчас | Цель |
|---------|--------|------|
| Время до первого взаимодействия | ~8s | <5s |
| Использование AI улучшения | ~15% | >40% |
| Использование расширенных стилей | ~30% | >60% |
| Завершенность генерации | ~70% | >85% |

### Производительность

| Метрика | Сейчас | Цель |
|---------|--------|------|
| First Contentful Paint | 1.5s | <0.8s |
| Time to Interactive | 2.2s | <1.2s |
| API Response Time | 450ms | <300ms |
| Количество API запросов | 100/min | 50/min |

### Качество кода

| Метрика | Сейчас | Цель |
|---------|--------|------|
| Test Coverage | ~30% | >70% |
| TypeScript ошибки | 3 | 0 |
| Console.* в production | 69+ | 0 |
| Дублирование кода | Высокое | -60% |
| Lighthouse Score | 75 | >90 |

### Функциональность

| Функция | Статус | Цель |
|---------|--------|------|
| handleLike в Library | ❌ TODO | ✅ Реализовано |
| handleDownload в Library | ❌ TODO | ✅ Реализовано |
| handleShare в Library | ❌ TODO | ✅ Реализовано |
| generate-lyrics API | ⚠️ Неверный endpoint | ✅ Исправлено |
| Tooltips в UI | 0 | ✅ 50+ |
| Музыкальные стили | 6 | ✅ 70+ |
| improve-lyrics функция | ❌ Нет | ✅ Создана |

---

## 🎯 Ключевые результаты Sprint 19

### ✅ Пользовательский опыт:
- 50+ интерактивных tooltips
- Расширенный редактор лирики с 5+ полями
- 70+ музыкальных стилей в 8 категориях
- AI-рекомендации стилей
- История использованных стилей

### ✅ AI Функциональность:
- Исправлены все AI endpoints
- Новая функция improve-lyrics
- Structured outputs во всех ответах
- Поддержка русского и английского
- Улучшенные system prompts

### ✅ Производительность:
- FCP < 0.8s
- TTI < 1.2s
- 0 console.* в production
- Мемоизированы критические компоненты
- Оптимизированы database queries

### ✅ Качество кода:
- Test coverage > 70%
- useTrackOperations хук везде
- 0 TypeScript ошибок
- E2E тесты для критических flows
- Актуальная документация

---

## 🚀 Roadmap дальнейших спринтов

### Sprint 20: Mobile PWA & Real-time
- Полная поддержка PWA с offline mode
- WebSocket для real-time collaboration
- Advanced analytics dashboard
- Playlist management

### Sprint 21: Advanced AI Features
- AI voice cloning для вокала
- MIDI export функциональность
- VST plugin integration
- Advanced audio effects

### Sprint 22: Social & Community
- Система комментариев
- Публичные плейлисты
- Профили пользователей
- Социальные функции (follow, share)

### Long-term Vision
- Desktop приложение (Electron)
- Mobile apps (React Native)
- DAW integration
- Collaborative workspace
- Marketplace для AI моделей

---

## 📈 Общая статистика

**Всего часов Sprint 19**: 104 часа  
**Распределение:**
- Неделя 1 (Критические исправления): 26 часов
- Неделя 2 (AI улучшения): 30 часов
- Неделя 3 (Производительность): 24 часа
- Неделя 4 (Технический долг): 24 часа

**Распределение по типам задач:**
- UX/UI: 38 часов (37%)
- AI/Backend: 28 часов (27%)
- Performance: 24 часов (23%)
- Testing/Audit: 14 часов (13%)

---

*Обновлено: Sprint 18*
