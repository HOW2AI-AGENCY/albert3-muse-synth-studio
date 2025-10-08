# 🧩 Руководство по компонентам

## Обзор

Полное руководство по основным компонентам проекта Albert3 Muse Synth Studio с примерами использования, лучшими практиками и паттернами.

## 📁 Структура компонентов

```
src/components/
├── ui/                      # Базовые UI компоненты (Radix UI + shadcn)
├── player/                  # Компоненты аудиоплеера
├── tracks/                  # Компоненты управления треками
├── workspace/               # Компоненты рабочего пространства
├── navigation/              # Компоненты навигации
├── animations/              # Анимационные компоненты
├── layout/                  # Компоненты макета
└── mobile/                  # Мобильные UI паттерны
```

## 🎵 Основные компоненты

### 1. MusicGenerator

**Путь**: `src/components/MusicGenerator.tsx`

Главный компонент для генерации музыки с помощью AI.

#### Особенности
- Поддержка двух провайдеров: Replicate и Suno
- Режимы: Simple (промпт) и Custom (с текстом песни)
- Интеграция с Edge Functions
- Полная адаптивность
- Бета-поддержка аудио-референсов и выбора вокальной персоны в кастомном режиме

#### Использование
```typescript
<MusicGenerator 
  onTrackGenerated={() => {
    console.log('Track generated!');
    refreshTracks();
  }}
/>
```

#### Ключевые функции
- **generateMusic**: Запуск генерации через Edge Function
- **improvePrompt**: Улучшение промпта с помощью AI
- **handleLyricsGenerate**: Генерация текста песни

#### Состояние
```typescript
const {
  prompt,
  setPrompt,
  isGenerating,
  isImproving,
  provider,
  setProvider,
  hasVocals,
  setHasVocals,
  lyrics,
  setLyrics,
  styleTags,
  addStyleTag,
  removeStyleTag,
  canGenerate,
  generateMusic,
  improvePrompt,
} = useMusicGeneration();
```

### 2. GlobalAudioPlayer

**Путь**: `src/components/player/GlobalAudioPlayer.tsx`

Глобальный аудиоплеер с полным набором функций.

#### Особенности
- Управление очередью воспроизведения
- Режим повтора и перемешивания
- Визуализация прогресса
- Интеграция с Media Session API
- Мини-плеер и полноэкранный режим

#### Контекст
```typescript
const {
  currentTrack,
  isPlaying,
  queue,
  currentIndex,
  playTrack,
  togglePlayPause,
  playNext,
  playPrevious,
  seekTo,
  setVolume,
  toggleRepeat,
  toggleShuffle,
} = useAudioPlayer();
```

#### Пример
```typescript
// Воспроизведение трека
playTrack({
  id: track.id,
  title: track.title,
  audio_url: track.audio_url,
  cover_url: track.cover_url,
});

// Пауза/воспроизведение
togglePlayPause();

// Перемотка
seekTo(30); // 30 секунд
```

### 3. TracksList

**Путь**: `src/components/TracksList.tsx`

Оптимизированный список треков с виртуализацией.

#### Пропсы
```typescript
interface TracksListProps {
  tracks: Track[];
  isLoading: boolean;
  deleteTrack: (id: string) => Promise<void>;
  refreshTracks: () => void;
  onTrackSelect?: (track: Track) => void;
  selectedTrackId?: string;
}
```

#### Особенности
- Виртуализация для больших списков
- Skeleton загрузка
- Фильтрация по статусу
- Адаптивная сетка

#### Использование
```typescript
<TracksList
  tracks={tracks}
  isLoading={isLoading}
  deleteTrack={deleteTrack}
  refreshTracks={refreshTracks}
  onTrackSelect={handleTrackSelect}
  selectedTrackId={selectedTrack?.id}
/>
```

### 4. DetailPanel

**Путь**: `src/components/workspace/DetailPanel.tsx`

Панель деталей трека с редактированием метаданных.

#### Особенности
- Редактирование метаданных (название, жанр, настроение)
- Управление публичностью
- Отображение версий и стемов
- Статистика (просмотры, лайки)
- Удаление трека

#### Оптимизации
- useReducer для управления состоянием
- Мемоизация обработчиков
- Компактный дизайн для мобильных

#### Пример
```typescript
<DetailPanel
  track={selectedTrack}
  onClose={() => setSelectedTrack(null)}
  onUpdate={refreshTracks}
  onDelete={handleDelete}
/>
```

### 5. TrackStemsPanel

**Путь**: `src/components/tracks/TrackStemsPanel.tsx`

Компонент для управления аудио стемами.

#### Режимы
- **Базовое разделение**: Вокал + Инструментал
- **Детальное разделение**: До 8 инструментов

#### Функции
```typescript
// Генерация стемов
const handleGenerateStems = async (mode) => {
  await supabase.functions.invoke('separate-stems', {
    body: { trackId, separationMode: mode }
  });
};

// Воспроизведение стема
const handlePlayStem = (stem) => {
  playTrack({
    id: `stem-${stem.id}`,
    title: stemTypeLabels[stem.stem_type],
    audio_url: stem.audio_url,
  });
};
```

#### Использование
```typescript
<TrackStemsPanel
  trackId={track.id}
  stems={stems}
  onStemsGenerated={loadVersionsAndStems}
/>
```

### 6. BottomTabBar

**Путь**: `src/components/navigation/BottomTabBar.tsx`

Мобильная навигация через нижнюю панель.

#### Особенности
- Haptic feedback
- Активные индикаторы
- Бейджи для уведомлений
- Автоматическое скрытие на десктопах

#### Конфигурация
```typescript
const tabs = [
  {
    id: 'dashboard',
    label: 'Главная',
    icon: Home,
    path: '/workspace/dashboard',
    badge: 0,
  },
  {
    id: 'generate',
    label: 'Создать',
    icon: Plus,
    path: '/workspace/generate',
  },
  // ...
];
```

### 7. TrackCard

**Путь**: `src/components/TrackCard.tsx`

Карточка отдельного трека.

#### Варианты
- **Компактный**: Для списков
- **Полный**: С подробной информацией
- **Плейлист**: Упрощенный для очереди

#### Пример
```typescript
<TrackCard
  track={track}
  onPlay={() => playTrack(track)}
  onDelete={() => deleteTrack(track.id)}
  variant="compact"
  isPlaying={currentTrack?.id === track.id}
/>
```

## 🎨 UI Компоненты (shadcn/ui)

### Базовые компоненты

#### Button
```typescript
<Button 
  variant="default"    // default | outline | ghost | destructive
  size="default"       // default | sm | lg | icon
  onClick={handleClick}
>
  Click me
</Button>
```

#### Card
```typescript
<Card className="p-4">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
  <CardFooter>
    Footer actions
  </CardFooter>
</Card>
```

#### Dialog
```typescript
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Sheet (Drawer)
```typescript
<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger asChild>
    <Button>Open Sheet</Button>
  </SheetTrigger>
  <SheetContent 
    side="right"              // top | right | bottom | left
    className="w-[400px]"
  >
    <SheetHeader>
      <SheetTitle>Title</SheetTitle>
    </SheetHeader>
    {/* Content */}
  </SheetContent>
</Sheet>
```

#### Accordion
```typescript
<Accordion type="multiple" defaultValue={["item-1"]}>
  <AccordionItem value="item-1">
    <AccordionTrigger>Section 1</AccordionTrigger>
    <AccordionContent>
      Content 1
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Section 2</AccordionTrigger>
    <AccordionContent>
      Content 2
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

#### Tabs
```typescript
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">
    Content 1
  </TabsContent>
  <TabsContent value="tab2">
    Content 2
  </TabsContent>
</Tabs>
```

## 🎯 Паттерны использования

### 1. Адаптивный дизайн

```typescript
// Мобильный/Десктопный переключатель
const isMobile = useIsMobile();

return (
  <>
    {isMobile ? (
      <MobileVersion />
    ) : (
      <DesktopVersion />
    )}
  </>
);
```

### 2. Состояние загрузки

```typescript
{isLoading ? (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
) : (
  <ActualContent data={data} />
)}
```

### 3. Обработка ошибок

```typescript
<ErrorBoundary
  fallback={<ErrorFallback />}
  onError={(error) => console.error(error)}
>
  <ComponentThatMightFail />
</ErrorBoundary>
```

### 4. Toast уведомления

```typescript
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

toast({
  title: "Success!",
  description: "Operation completed",
  variant: "default", // default | destructive
});
```

### 5. Виртуализация списков

```typescript
<VirtualizedList
  items={tracks}
  renderItem={(track) => <TrackCard track={track} />}
  itemHeight={100}
  overscan={5}
/>
```

## 🚀 Производительность

### Мемоизация

```typescript
// useMemo для тяжелых вычислений
const filteredTracks = useMemo(() => {
  return tracks.filter(t => t.status === 'completed');
}, [tracks]);

// useCallback для функций
const handlePlay = useCallback((track) => {
  playTrack(track);
}, [playTrack]);
```

### Lazy Loading

```typescript
// Компоненты
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<LoadingSkeleton />}>
  <HeavyComponent />
</Suspense>

// Изображения
<LazyImage
  src={imageUrl}
  alt="Description"
  loading="lazy"
/>
```

### Code Splitting

```typescript
// Роуты
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Studio = lazy(() => import('@/pages/Studio'));

<Routes>
  <Route path="/dashboard" element={
    <Suspense fallback={<Loader />}>
      <Dashboard />
    </Suspense>
  } />
</Routes>
```

## 📱 Мобильные компоненты

### ResponsiveLayout

```typescript
<ResponsiveLayout
  mobile={<MobileLayout />}
  desktop={<DesktopLayout />}
  breakpoint={1024}
/>
```

### Swipe Gestures

```typescript
const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
  onSwipeLeft: () => playNext(),
  onSwipeRight: () => playPrevious(),
});

<div
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
  {content}
</div>
```

## 🎨 Стилизация

### Tailwind классы

```typescript
// Адаптивные размеры
<div className="text-sm sm:text-base lg:text-lg">

// Условные классы
<div className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
)}>

// Темная тема
<div className="bg-white dark:bg-gray-900">
```

### CSS переменные

```css
/* index.css */
:root {
  --primary: 222.2 47.4% 11.2%;
  --background: 0 0% 100%;
}

.dark {
  --primary: 210 40% 98%;
  --background: 222.2 84% 4.9%;
}
```

## 🧪 Тестирование

### Unit тесты

```typescript
import { render, screen } from '@testing-library/react';
import { TrackCard } from './TrackCard';

test('renders track card', () => {
  const track = { id: '1', title: 'Test Track' };
  render(<TrackCard track={track} />);
  expect(screen.getByText('Test Track')).toBeInTheDocument();
});
```

### Integration тесты

```typescript
test('plays track on click', async () => {
  const { user } = setup();
  const playButton = screen.getByRole('button', { name: /play/i });
  
  await user.click(playButton);
  
  expect(mockPlayTrack).toHaveBeenCalled();
});
```

## 📚 Best Practices

### 1. Композиция над наследованием
```typescript
// ❌ Плохо
class TrackCard extends BaseCard { }

// ✅ Хорошо
const TrackCard = ({ children, ...props }) => (
  <Card {...props}>
    {children}
  </Card>
);
```

### 2. Prop drilling vs Context
```typescript
// ❌ Избегайте глубокого prop drilling
<Parent track={track}>
  <Child track={track}>
    <GrandChild track={track} />
  </Child>
</Parent>

// ✅ Используйте Context
<AudioPlayerProvider>
  <Parent>
    <Child>
      <GrandChild /> {/* использует useAudioPlayer() */}
    </Child>
  </Parent>
</AudioPlayerProvider>
```

### 3. Типизация
```typescript
// ✅ Строгая типизация
interface TrackCardProps {
  track: Track;
  onPlay: (track: Track) => void;
  variant?: 'compact' | 'full';
}

const TrackCard: React.FC<TrackCardProps> = ({ track, onPlay, variant = 'compact' }) => {
  // ...
};
```

### 4. Accessibility
```typescript
<Button 
  aria-label="Play track"
  role="button"
  tabIndex={0}
>
  <Play className="sr-only">Play</Play>
</Button>
```

## 🔍 Отладка

### React DevTools
- Проверка пропсов и состояния
- Анализ ре-рендеров
- Профилирование производительности

### Console логирование
```typescript
import { logInfo, logError, logDebug } from '@/utils/logger';

logInfo('Track played', 'TrackCard', { trackId: track.id });
logError('Failed to load', error, 'TracksList');
```

---

**Версия**: 1.5.0  
**Последнее обновление**: Январь 2025  
**Статус**: ✅ Актуально
