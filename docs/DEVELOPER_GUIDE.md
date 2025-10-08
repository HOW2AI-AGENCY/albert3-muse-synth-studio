# 👨‍💻 Руководство разработчика

## 🛠️ Настройка окружения

```bash
# Клонирование
git clone <repo-url>
cd albert3-muse-synth-studio

# Установка зависимостей
npm install

# Настройка .env (автоматически через Lovable Cloud)

# Запуск dev сервера
npm run dev
```

## 📁 Структура проекта

```
src/
├── components/          # React компоненты
│   ├── ui/             # shadcn/ui компоненты
│   ├── player/         # Аудио плеер
│   ├── tracks/         # Управление треками
│   └── workspace/      # Workspace UI
├── hooks/              # Custom hooks
├── services/           # API сервисы
├── utils/              # Утилиты
├── pages/              # Страницы (роуты)
└── contexts/           # React contexts

supabase/
├── functions/          # Edge Functions
└── migrations/         # DB миграции
```

## 🎯 Ключевые концепции

### State Management
- **Global State**: AudioPlayerContext, ThemeContext
- **Server State**: TanStack Query (useTracks, useMusicGeneration)
- **Local State**: useState, useReducer

### Performance
- **Memoization**: React.memo, useMemo, useCallback
- **Code Splitting**: React.lazy для роутов
- **Virtualization**: react-window для списков
- **Caching**: Service Worker для аудио

### AI Integration
- **Lovable AI**: lyrics, prompts, suggestions
- **Suno AI**: music generation
- **Replicate**: stem separation

## 📝 Coding Standards

### TypeScript
```typescript
// ✅ GOOD
interface TrackProps {
  track: Track;
  onPlay: (id: string) => void;
}

// ❌ BAD
const TrackCard = (props: any) => {}
```

### React Patterns
```typescript
// ✅ Memoization
const TrackCard = React.memo(({ track }) => {
  const handlePlay = useCallback(() => {
    playTrack(track.id);
  }, [track.id]);
  
  return <div onClick={handlePlay}>{track.title}</div>;
});

// ✅ Custom hooks
const useTrackOperations = () => {
  // Reusable logic
};
```

### Logging
```typescript
// ✅ GOOD
import { logger } from '@/utils/logger';
logger.info('Track generated', { trackId, duration });

// ❌ BAD
console.log('Track generated');
```

## 🧪 Тестирование

```bash
# Unit тесты
npm run test

# E2E тесты (Sprint 19)
npm run test:e2e

# Coverage
npm run test:coverage
```

## 🚀 Sprint 19 - Задачи разработчиков

### Неделя 1
- [ ] Исправить AI endpoints
- [ ] Реализовать handleLike/Download/Share
- [ ] Добавить 50+ tooltips

### Неделя 2
- [ ] Переработать LyricsEditor
- [ ] Добавить 70+ музыкальных стилей
- [ ] Создать improve-lyrics function

### Неделя 3
- [ ] Заменить console.* на logger.*
- [ ] Мемоизировать компоненты
- [ ] Оптимизировать API

### Неделя 4
- [ ] Создать useTrackOperations hook
- [ ] Написать E2E тесты
- [ ] Провести Suno API аудит

---

*Обновлено: Sprint 18*
