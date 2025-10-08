# 🚀 Sprint 19: UX Excellence & AI Content Quality

**Период**: 1-28 ноября 2025  
**Статус**: 📋 Запланирован  
**Приоритет**: HIGH - Пользовательский опыт и качество AI контента

---

## 🎯 Общая цель спринта

Кардинально улучшить пользовательский опыт и качество генерируемого AI контента через:
1. **50+ интерактивных подсказок** для упрощения навигации
2. **Расширенный редактор лирики** с AI улучшениями
3. **70+ музыкальных стилей** с категоризацией и рекомендациями
4. **Централизованное логирование** и снижение технического долга

---

## 📅 НЕДЕЛЯ 1: Критические исправления (1-7 ноября)

### UX-001: Исправление AI функций ⚡
**Приоритет**: CRITICAL  
**Оценка**: 8 часов  
**Назначен**: AI Team  
**Статус**: ✅ ЗАВЕРШЕНО

#### Задачи:
- [x] **generate-lyrics**: Исправлен API endpoint на `https://ai.gateway.lovable.dev/v1/chat/completions`
- [x] **improve-prompt**: Улучшен system prompt для более креативных результатов
- [x] **suggest-styles**: Добавлен structured output через tool calling
- [x] Протестировать все AI endpoints с разными входными данными

#### Выполнено:
✅ `generate-lyrics` - исправлен endpoint + улучшен system prompt  
✅ `improve-prompt` - детальный prompt с музыкальной терминологией  
✅ `suggest-styles` - реализован tool calling для structured JSON output  

#### Критерии приемки:
- ✅ Все AI функции возвращают корректные ответы
- ✅ Время ответа < 5 секунд для каждой функции
- ✅ Обработка ошибок с понятными сообщениями пользователю
- ✅ Structured output через tool calling

---

### UX-002: Реализация функций Library ⚡
**Приоритет**: CRITICAL  
**Оценка**: 6 часов  
**Назначен**: Frontend Team  
**Статус**: ✅ ЗАВЕРШЕНО

#### Задачи:
- [x] Реализовать `handleLike(trackId)` с интеграцией likes.service.ts
- [x] Реализовать `handleDownload(trackId)` с загрузкой из Supabase Storage
- [x] Реализовать `handleShare(trackId)` с генерацией публичной ссылки
- [x] Добавить loading states для всех действий
- [x] Toast уведомления для каждого действия

#### Критерии приемки:
- ✅ Like/Unlike работает с мгновенным UI обновлением
- ✅ Download корректно загружает аудио файл
- ✅ Share генерирует корректную публичную ссылку
- ✅ Все действия имеют loading индикаторы

---

### UX-003: Система Tooltips (Часть 1) 💡
**Приоритет**: HIGH  
**Оценка**: 12 часов  
**Назначен**: UI/UX Team  
**Статус**: ✅ ЗАВЕРШЕНО

#### Целевые компоненты:
**MusicGenerator** (20 tooltips):
- [x] Provider selector (Replicate/Suno)
- [x] Mode toggle (Simple/Custom)
- [x] Prompt input
- [x] Improve Prompt button
- [x] Style tags (каждый тег)
- [x] Has Vocals toggle
- [x] Generate button
- [x] All genre/mood/tempo options

**DetailPanel** (15 tooltips):
- [x] Edit metadata button
- [x] Public toggle
- [x] Like button
- [x] Share button
- [x] Download button
- [x] Delete button
- [x] Version switcher
- [x] Stems panel buttons

**Player** (10 tooltips):
- [x] Play/Pause
- [x] Previous/Next
- [x] Shuffle
- [x] Repeat modes
- [x] Volume control
- [x] Queue button
- [x] Full screen

#### Критерии приемки:
- ✅ 45+ tooltips добавлено
- ✅ Все тексты понятны русскоязычным пользователям
- ✅ Tooltips появляются с задержкой 500ms
- ✅ Адаптивны для мобильных устройств

---

## 📅 НЕДЕЛЯ 2: AI контент улучшения (8-14 ноября)

### AI-001: Расширенный редактор лирики 📝
**Приоритет**: HIGH  
**Оценка**: 16 часов  
**Назначен**: Full Stack Team

#### Архитектура:
```typescript
// New LyricsEditor structure
<Tabs defaultValue="generate">
  <TabsList>
    <TabsTrigger value="generate">AI Генерация</TabsTrigger>
    <TabsTrigger value="manual">Вручную</TabsTrigger>
  </TabsList>
  
  <TabsContent value="generate">
    <LyricsGenerationForm />
  </TabsContent>
  
  <TabsContent value="manual">
    <LyricsManualEditor />
  </TabsContent>
</Tabs>
```

#### Новые поля (AI Генерация):
- [ ] **Язык**: Select (Русский/English)
- [ ] **Структура песни**: Checkboxes (Intro, Verse, Chorus, Bridge, Outro)
- [ ] **Вокальный стиль**: Select (Male, Female, Duet, Choir)
- [ ] **Референсы**: Textarea (опционально, примеры артистов/песен)
- [ ] **Тема/настроение**: Input

#### Новая Edge Function: `improve-lyrics`
```typescript
// supabase/functions/improve-lyrics/index.ts
interface ImproveLyricsRequest {
  currentLyrics: string;
  language: 'ru' | 'en';
  style?: string;
  instructions?: string;
}
```

#### Задачи:
- [ ] Создать новую edge function `improve-lyrics`
- [ ] Рефакторинг LyricsEditor.tsx с вкладками
- [ ] Добавить все новые поля с валидацией
- [ ] Кнопка "Улучшить с AI" для существующей лирики
- [ ] Счетчик строк и символов
- [ ] Preview режим с форматированием

#### Критерии приемки:
- ✅ 2 режима работают: AI генерация и ручной ввод
- ✅ Все новые поля корректно передаются в AI
- ✅ Улучшение существующей лирики работает
- ✅ Корректная обработка русского и английского языков
- ✅ UI адаптивен для мобильных

---

### AI-002: Расширенная система стилей 🎨
**Приоритет**: HIGH  
**Оценка**: 14 часов  
**Назначен**: Frontend + AI Team

#### Новая структура стилей (70+ жанров):

```typescript
const musicStylesCategories = [
  {
    name: 'Электроника',
    emoji: '🎹',
    styles: [
      'House', 'Techno', 'Trance', 'Dubstep', 'Drum and Bass',
      'EDM', 'Synthwave', 'Chillwave', 'Ambient', 'IDM'
    ]
  },
  {
    name: 'Рок',
    emoji: '🎸',
    styles: [
      'Rock', 'Alternative Rock', 'Indie Rock', 'Hard Rock', 'Metal',
      'Punk', 'Grunge', 'Post-Rock', 'Progressive Rock', 'Psychedelic Rock'
    ]
  },
  {
    name: 'Поп',
    emoji: '🎤',
    styles: [
      'Pop', 'Synth-Pop', 'Dream Pop', 'Indie Pop', 'K-Pop',
      'J-Pop', 'Electro Pop', 'Dance Pop', 'Art Pop'
    ]
  },
  {
    name: 'Хип-хоп',
    emoji: '🎧',
    styles: [
      'Hip-Hop', 'Rap', 'Trap', 'Lo-fi Hip-Hop', 'Boom Bap',
      'Cloud Rap', 'Drill', 'Grime', 'Underground Hip-Hop'
    ]
  },
  {
    name: 'Джаз и Блюз',
    emoji: '🎺',
    styles: [
      'Jazz', 'Blues', 'Swing', 'Bebop', 'Smooth Jazz',
      'Acid Jazz', 'Jazz Fusion', 'Soul', 'Funk'
    ]
  },
  {
    name: 'Классика',
    emoji: '🎻',
    styles: [
      'Classical', 'Orchestral', 'Chamber Music', 'Opera',
      'Baroque', 'Romantic', 'Contemporary Classical', 'Minimalism'
    ]
  },
  {
    name: 'Мировая музыка',
    emoji: '🌍',
    styles: [
      'Latin', 'Reggae', 'Afrobeat', 'Bossa Nova', 'Flamenco',
      'Celtic', 'Middle Eastern', 'Indian Classical', 'K-Folk'
    ]
  },
  {
    name: 'Экспериментальная',
    emoji: '🔬',
    styles: [
      'Experimental', 'Noise', 'Avant-Garde', 'Glitch',
      'Vaporwave', 'Phonk', 'Breakcore', 'Industrial'
    ]
  }
];
```

#### UI Компоненты:
```typescript
<Accordion type="multiple" className="w-full">
  {musicStylesCategories.map(category => (
    <AccordionItem value={category.name}>
      <AccordionTrigger>
        <span>{category.emoji} {category.name}</span>
        <Badge>{category.styles.length}</Badge>
      </AccordionTrigger>
      <AccordionContent>
        <div className="flex flex-wrap gap-2">
          {category.styles.map(style => (
            <Badge
              variant={selectedStyles.includes(style) ? "default" : "outline"}
              onClick={() => toggleStyle(style)}
            >
              {style}
            </Badge>
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

#### Дополнительные функции:
- [ ] **Поиск стилей**: Input с фильтрацией в реальном времени
- [ ] **Недавние стили**: localStorage с историей последних 10 использованных
- [ ] **AI рекомендации**: "Похожие стили" на основе выбранных
- [ ] **Быстрый выбор**: Preset комбинации ("Летний хит", "Меланхоличный вайб", "Энергичная тренировка")

#### Задачи:
- [ ] Создать структуру 70+ стилей с категориями
- [ ] Реализовать Accordion UI с поиском
- [ ] Добавить localStorage для истории
- [ ] Реализовать AI рекомендации через suggest-styles
- [ ] Добавить preset комбинации
- [ ] Градиентные бейджи для визуальной привлекательности

#### Критерии приемки:
- ✅ 70+ стилей доступны в 8 категориях
- ✅ Поиск работает мгновенно
- ✅ История последних стилей сохраняется
- ✅ AI рекомендации релевантны
- ✅ UI красивый и интуитивный

---

## 📅 НЕДЕЛЯ 3: Производительность (15-21 ноября)

### PERF-002: Централизованное логирование 📊
**Приоритет**: HIGH  
**Оценка**: 8 часов  
**Назначен**: DevOps Team

#### Задачи:
- [ ] Найти все 69+ использований `console.log/error/warn`
- [ ] Заменить на `logger.info/error/warn/debug`
- [ ] Добавить контекст к каждому логу:
  ```typescript
  logger.info('Track generated', {
    trackId: track.id,
    duration: performance.now() - startTime,
    provider: 'suno'
  });
  ```
- [ ] Настроить отправку критических ошибок на сервер (production)
- [ ] Добавить log levels по окружению (dev: debug, prod: error)

#### Файлы для обновления:
- src/hooks/useTracks.ts
- src/hooks/useMusicGeneration.ts
- src/services/*.service.ts
- src/components/MusicGenerator.tsx
- src/components/player/*.tsx
- И 30+ других файлов

#### Критерии приемки:
- ✅ 0 использований console.* в production bundle
- ✅ Все логи имеют контекст
- ✅ Критические ошибки отправляются на сервер
- ✅ Логи структурированы (JSON format)

---

### PERF-003: Мемоизация компонентов ⚡
**Приоритет**: HIGH  
**Оценка**: 10 часов  
**Назначен**: Performance Team

#### Целевые компоненты:
- [ ] **TrackCard**: React.memo + useMemo для производных данных
- [ ] **TrackListItem**: React.memo + useCallback для всех handlers
- [ ] **MiniPlayer**: React.memo + мемоизация текущего трека
- [ ] **PlayerQueue**: React.memo для каждого элемента очереди
- [ ] **DetailPanel**: Уже оптимизирован с useReducer ✅

#### Паттерн:
```typescript
export const TrackCard = React.memo(({ track, onPlay, onDelete }) => {
  const handlePlay = useCallback(() => {
    onPlay(track);
  }, [onPlay, track]);

  const formattedDuration = useMemo(() => {
    return formatDuration(track.duration);
  }, [track.duration]);

  return (
    // JSX with memoized values and callbacks
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-renders
  return prevProps.track.id === nextProps.track.id &&
         prevProps.isPlaying === nextProps.isPlaying;
});
```

#### Критерии приемки:
- ✅ Все критические компоненты мемоизированы
- ✅ Re-renders сокращены на 60%+
- ✅ FPS в списках стабильные 60
- ✅ React DevTools Profiler показывает улучшения

---

### PERF-004: Оптимизация API ⚡
**Приоритет**: MEDIUM  
**Оценка**: 6 часов  
**Назначен**: Backend Team

#### Задачи:
- [ ] **Polling optimization**: Экспоненциальный backoff в Generate.tsx
  ```typescript
  const delays = [2000, 3000, 5000, 8000, 12000]; // ms
  ```
- [ ] **Database indexes**:
  ```sql
  CREATE INDEX idx_tracks_user_created ON tracks(user_id, created_at DESC);
  CREATE INDEX idx_tracks_status ON tracks(status) WHERE status != 'completed';
  CREATE INDEX idx_track_likes_user_track ON track_likes(user_id, track_id);
  ```
- [ ] **React Query optimization**:
  ```typescript
  staleTime: 5 * 60 * 1000, // 5 минут для tracks
  cacheTime: 10 * 60 * 1000, // 10 минут
  ```
- [ ] **Optimistic updates** для like/unlike

#### Критерии приемки:
- ✅ Polling не перегружает сервер
- ✅ Queries выполняются < 100ms
- ✅ Like/Unlike мгновенные в UI
- ✅ Cache hit ratio > 70%

---

## 📅 НЕДЕЛЯ 4: Технический долг (22-28 ноября)

### TECH-001: Переиспользуемый хук для треков 🔧
**Приоритет**: MEDIUM  
**Оценка**: 8 часов  
**Назначен**: Architecture Team

#### Создать: `src/hooks/useTrackOperations.ts`

```typescript
interface UseTrackOperationsReturn {
  deleteTrack: (trackId: string) => Promise<void>;
  togglePublic: (trackId: string, isPublic: boolean) => Promise<void>;
  downloadTrack: (trackId: string) => Promise<void>;
  shareTrack: (trackId: string) => Promise<string>;
  likeTrack: (trackId: string) => Promise<void>;
  unlikeTrack: (trackId: string) => Promise<void>;
  isDeleting: boolean;
  isToggling: boolean;
  isDownloading: boolean;
}

export const useTrackOperations = (): UseTrackOperationsReturn => {
  // Централизованная логика для всех операций с треками
};
```

#### Использование в компонентах:
- Library.tsx
- DetailPanel.tsx
- TrackCard.tsx
- TrackListItem.tsx

#### Задачи:
- [ ] Создать хук с всеми функциями
- [ ] Добавить loading states для каждой операции
- [ ] Добавить error handling
- [ ] Добавить toast уведомления
- [ ] Заменить дублированный код во всех компонентах
- [ ] Написать unit тесты для хука

#### Критерии приемки:
- ✅ Дублированный код сокращен на 60%
- ✅ Все компоненты используют единый хук
- ✅ 100% test coverage для хука
- ✅ Типобезопасность с TypeScript

---

### TEST-001: E2E тестирование 🧪
**Приоритет**: HIGH  
**Оценка**: 12 часов  
**Назначен**: QA Team

#### Setup Playwright:
```bash
npm install -D @playwright/test
npx playwright install
```

#### Критические flows:
1. **Auth Flow** (2 часа):
   ```typescript
   test('user can sign up and login', async ({ page }) => {
     await page.goto('/auth');
     await page.fill('[name=email]', 'test@example.com');
     await page.fill('[name=password]', 'password123');
     await page.click('button:has-text("Sign Up")');
     await expect(page).toHaveURL('/workspace/dashboard');
   });
   ```

2. **Music Generation Flow** (3 часа):
   - Create prompt
   - Generate track
   - Wait for completion
   - Verify track in library

3. **Playback Flow** (2 часа):
   - Play track
   - Pause/Resume
   - Skip next/previous
   - Volume control

4. **Library Management** (2 часа):
   - View tracks
   - Filter by status
   - Delete track
   - Like/Unlike

5. **Stems Separation** (3 часа):
   - Select track
   - Generate stems
   - Download stem

#### Критерии приемки:
- ✅ 5 критических flows покрыты
- ✅ CI/CD интеграция (GitHub Actions)
- ✅ Screenshot comparison для UI regression
- ✅ Performance assertions (page load < 3s)

---

### AUDIT-001: Suno API аудит 🔍
**Приоритет**: MEDIUM  
**Оценка**: 4 часа  
**Назначен**: Integration Team

#### Задачи:
- [ ] Проверить актуальность endpoints:
  - `POST /api/generate` - генерация музыки
  - `GET /api/feed` - статус генерации
- [ ] Проверить формат ответов (изменения в API):
  ```typescript
  interface SunoResponse {
    id: string;
    title: string;
    audio_url: string;
    // Новые поля?
  }
  ```
- [ ] Проверить rate limits (изменились?)
- [ ] Проверить новые возможности API
- [ ] Обновить типы в `src/types/track.ts`
- [ ] Обновить документацию в `docs/api/API.md`

#### Критерии приемки:
- ✅ Все endpoints работают корректно
- ✅ Типы актуальны
- ✅ Rate limits документированы
- ✅ Новые возможности задокументированы

---

## 📊 Метрики успеха Sprint 19

### Пользовательский опыт:
| Метрика | Текущее | Цель | Измерение |
|---------|---------|------|-----------|
| Время до первого взаимодействия | ~8s | <5s | Google Analytics |
| Использование AI улучшения лирики | ~15% | >40% | Supabase Analytics |
| Использование расширенных стилей | ~30% | >60% | Feature tracking |
| Завершенность генерации | ~70% | >85% | Conversion rate |

### Техническая производительность:
| Метрика | Текущее | Цель | Инструмент |
|---------|---------|------|------------|
| First Contentful Paint | 1.5s | <0.8s | Lighthouse |
| Time to Interactive | 2.2s | <1.2s | Lighthouse |
| API Response Time (avg) | 450ms | <300ms | Monitoring |
| Количество API запросов | 100/min | 50/min | Analytics |
| FPS в списках | 45-55 | Стабильные 60 | DevTools |

### Качество кода:
| Метрика | Текущее | Цель | Инструмент |
|---------|---------|------|------------|
| Test Coverage | ~30% | >70% | Jest/Vitest |
| TypeScript ошибки | 3 | 0 | tsc --noEmit |
| Console.* в production | 69+ | 0 | Grep |
| Дублирование кода | Высокое | -60% | SonarQube |
| Lighthouse Score | 75 | >90 | Lighthouse |

### Функциональность:
| Функция | Статус | Цель |
|---------|--------|------|
| handleLike в Library | ❌ TODO | ✅ Реализовано |
| handleDownload в Library | ❌ TODO | ✅ Реализовано |
| handleShare в Library | ❌ TODO | ✅ Реализовано |
| generate-lyrics API | ⚠️ Неверный endpoint | ✅ Исправлено |
| Tooltips в UI | 0 | ✅ 50+ добавлено |
| Музыкальные стили | 6 базовых | ✅ 70+ категоризированных |
| improve-lyrics функция | ❌ Нет | ✅ Создана |

---

## 🎯 Ключевые результаты (KPIs)

### По окончанию Sprint 19 мы должны иметь:

#### ✅ Пользовательский опыт:
- 50+ интерактивных tooltips
- Расширенный редактор лирики с 5+ новыми полями
- 70+ музыкальных стилей в 8 категориях
- AI-рекомендации стилей
- История последних использованных стилей

#### ✅ AI Функциональность:
- Исправлены все AI endpoints
- Новая функция improve-lyrics
- Structured outputs во всех AI ответах
- Поддержка русского и английского языков
- Улучшенные system prompts

#### ✅ Производительность:
- FCP < 0.8s
- TTI < 1.2s
- 0 console.* в production
- Мемоизированы все критические компоненты
- Оптимизированы database queries

#### ✅ Качество кода:
- Test coverage > 70%
- useTrackOperations хук используется везде
- 0 TypeScript ошибок
- E2E тесты для критических flows
- Актуальная документация

---

## 🚀 Следующие шаги после Sprint 19

### Sprint 20 (декабрь 2025):
- **Mobile PWA**: Полная поддержка PWA с offline mode
- **Real-time collaboration**: WebSocket для совместной работы
- **Advanced analytics**: Dashboard с детальной аналитикой
- **Playlist management**: Создание и управление плейлистами

### Long-term roadmap:
- **AI voice cloning**: Клонирование голоса для вокала
- **MIDI export**: Экспорт в MIDI формат
- **VST plugin integration**: Интеграция с DAW
- **Social features**: Сообщество и социальные функции

---

**Примерная дата начала**: 1 ноября 2025  
**Примерная дата окончания**: 28 ноября 2025  
**Общая оценка**: 104 часа (4 недели x 26 часов/неделя)

*Обновлено: 8 октября 2025*
