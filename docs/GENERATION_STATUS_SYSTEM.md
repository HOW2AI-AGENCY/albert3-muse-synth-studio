# Unified Generation Status System

**Sprint 37**: Generation System Audit  
**Created**: 2025-11-17  
**Status**: ✅ Implemented

---

## 📚 Оглавление

- [Обзор](#обзор)
- [Типы статусов](#типы-статусов)
- [Метаданные статусов](#метаданные-статусов)
- [Утилиты](#утилиты)
- [Валидация переходов](#валидация-переходов)
- [Интеграция](#интеграция)
- [Примеры использования](#примеры-использования)

---

## 🎯 Обзор

Унифицированная система статусов генерации треков обеспечивает:

- **Типобезопасность**: Строгая типизация для всех статусов
- **Консистентность**: Единая система статусов во всем приложении
- **Валидация**: Проверка валидности переходов между статусами
- **UI метаданные**: Готовые данные для отображения в интерфейсе
- **Обратная совместимость**: Маппинг legacy статусов

### Ключевые файлы

- `src/types/generation-status.ts` - Основной файл системы статусов
- `src/components/tracks/TrackStatusBadge.tsx` - UI компонент для отображения статуса

---

## 📊 Типы статусов

### TrackGenerationStatus

Основной тип для статусов генерации:

```typescript
export type TrackGenerationStatus = 
  | 'draft'       // Черновик, трек создан но генерация не начата
  | 'pending'     // Ожидает начала генерации
  | 'preparing'   // Подготовка (для Mureka - генерация текстов)
  | 'queued'      // В очереди на обработку
  | 'processing'  // Активная генерация
  | 'completed'   // Успешно завершено
  | 'failed'      // Ошибка генерации
  | 'cancelled'   // Отменено пользователем
  | 'timeout';    // Превышен таймаут
```

### TrackPublicationStatus

Статусы публикации трека:

```typescript
export type TrackPublicationStatus = 
  | 'private'     // Приватный трек
  | 'workspace'   // Доступен в workspace
  | 'public'      // Публичный трек
  | 'deleted';    // Удален
```

### TrackStatus

Комплексный статус трека:

```typescript
export interface TrackStatus {
  generation: TrackGenerationStatus;
  publication: TrackPublicationStatus;
  errorMessage?: string;
  retryCount?: number;
  lastUpdated: Date;
}
```

---

## 🎨 Метаданные статусов

Каждый статус имеет метаданные для отображения в UI:

```typescript
export interface StatusMetadata {
  label: string;              // Название для отображения
  description: string;        // Подробное описание
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  icon?: string;             // Иконка (опционально)
  canRetry: boolean;         // Можно ли повторить генерацию
  canCancel: boolean;        // Можно ли отменить генерацию
  showProgress: boolean;     // Нужно ли показывать прогресс
}
```

### Примеры метаданных

| Статус | Label | Color | canRetry | canCancel | showProgress |
|--------|-------|-------|----------|-----------|--------------|
| `draft` | Черновик | secondary | ❌ | ❌ | ❌ |
| `pending` | Ожидает | default | ❌ | ✅ | ✅ |
| `processing` | Генерация | primary | ❌ | ✅ | ✅ |
| `completed` | Готово | success | ❌ | ❌ | ❌ |
| `failed` | Ошибка | destructive | ✅ | ❌ | ❌ |
| `timeout` | Таймаут | warning | ✅ | ❌ | ❌ |

---

## 🛠️ Утилиты

### Проверки статуса

```typescript
// Проверяет, находится ли трек в процессе генерации
isInProgress(status: TrackGenerationStatus): boolean

// Проверяет, является ли статус финальным
isFinal(status: TrackGenerationStatus): boolean

// Проверяет, является ли статус ошибочным
isError(status: TrackGenerationStatus): boolean

// Проверяет, успешно ли завершена генерация
isSuccess(status: TrackGenerationStatus): boolean

// Можно ли повторить генерацию
canRetry(status: TrackGenerationStatus): boolean

// Можно ли отменить генерацию
canCancel(status: TrackGenerationStatus): boolean

// Нужно ли показывать прогресс
shouldShowProgress(status: TrackGenerationStatus): boolean
```

### Получение метаданных

```typescript
// Получает метаданные для статуса
getStatusMetadata(status: TrackGenerationStatus): StatusMetadata

// Форматирует статус для отображения
formatStatusForDisplay(status: TrackGenerationStatus): string

// Получает описание статуса
getStatusDescription(status: TrackGenerationStatus): string

// Получает вариант badge для UI
getStatusBadgeVariant(status: TrackGenerationStatus): 'default' | 'secondary' | 'destructive' | 'outline'
```

### Нормализация

```typescript
// Нормализует статус из базы данных
// Обеспечивает обратную совместимость с legacy статусами
normalizeStatus(rawStatus: string | null | undefined): TrackGenerationStatus

// Legacy mapping:
// 'ready' -> 'completed'
// 'published' -> 'completed'
// 'error' -> 'failed'
// 'waiting' -> 'pending'
```

---

## 🔄 Валидация переходов

Система включает валидацию переходов между статусами:

```typescript
// Проверяет, валиден ли переход
isValidTransition(from: TrackGenerationStatus, to: TrackGenerationStatus): boolean

// Получает список возможных следующих статусов
getNextValidStatuses(status: TrackGenerationStatus): TrackGenerationStatus[]
```

### Матрица переходов

```
draft → [pending, cancelled]
pending → [preparing, queued, processing, failed, cancelled]
preparing → [queued, processing, failed, cancelled]
queued → [processing, failed, cancelled, timeout]
processing → [completed, failed, cancelled, timeout]
completed → []
failed → [pending]
cancelled → [pending]
timeout → [pending]
```

---

## 🔌 Интеграция

### 1. Использование в компонентах

```typescript
import { 
  TrackGenerationStatus, 
  isInProgress, 
  getStatusMetadata,
  formatStatusForDisplay 
} from '@/types/generation-status';

const TrackCard = ({ track }) => {
  const status = track.status as TrackGenerationStatus;
  const metadata = getStatusMetadata(status);
  
  return (
    <div>
      <Badge variant={getStatusBadgeVariant(status)}>
        {formatStatusForDisplay(status)}
      </Badge>
      
      {isInProgress(status) && <ProgressBar />}
      
      {metadata.canRetry && (
        <Button onClick={handleRetry}>Повторить</Button>
      )}
    </div>
  );
};
```

### 2. Обработка в хуках

```typescript
import { isInProgress, isFinal, isError } from '@/types/generation-status';

const useTrackGeneration = (trackId: string) => {
  const track = useTrack(trackId);
  const status = track?.status as TrackGenerationStatus;
  
  const needsPolling = useMemo(() => 
    isInProgress(status), 
    [status]
  );
  
  const showNotification = useCallback(() => {
    if (isFinal(status)) {
      if (isError(status)) {
        toast.error('Генерация не удалась');
      } else {
        toast.success('Трек готов!');
      }
    }
  }, [status]);
  
  return { track, needsPolling, showNotification };
};
```

### 3. Фильтрация и сортировка

```typescript
import { STATUS_CATEGORIES } from '@/types/generation-status';

// Получить только треки в процессе генерации
const processingTracks = tracks.filter(t => 
  STATUS_CATEGORIES.IN_PROGRESS.includes(t.status as any)
);

// Получить только завершенные треки
const completedTracks = tracks.filter(t => 
  STATUS_CATEGORIES.SUCCESS.includes(t.status as any)
);

// Получить треки с ошибками
const failedTracks = tracks.filter(t => 
  STATUS_CATEGORIES.ERROR.includes(t.status as any)
);
```

---

## 💡 Примеры использования

### Пример 1: Отображение статуса трека

```typescript
import { 
  getStatusMetadata, 
  formatStatusForDisplay,
  getStatusBadgeVariant 
} from '@/types/generation-status';
import { Badge } from '@/components/ui/badge';

const TrackStatusDisplay = ({ status }: { status: TrackGenerationStatus }) => {
  const metadata = getStatusMetadata(status);
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusBadgeVariant(status)}>
        {formatStatusForDisplay(status)}
      </Badge>
      
      <Tooltip>
        <TooltipTrigger>
          <Info className="h-4 w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          {metadata.description}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
```

### Пример 2: Обработка действий

```typescript
import { canRetry, canCancel } from '@/types/generation-status';

const TrackActions = ({ track, onRetry, onCancel }) => {
  const status = track.status as TrackGenerationStatus;
  
  return (
    <div className="flex gap-2">
      {canRetry(status) && (
        <Button onClick={() => onRetry(track.id)}>
          Повторить
        </Button>
      )}
      
      {canCancel(status) && (
        <Button 
          variant="destructive" 
          onClick={() => onCancel(track.id)}
        >
          Отменить
        </Button>
      )}
    </div>
  );
};
```

### Пример 3: Polling логика

```typescript
import { isInProgress, shouldShowProgress } from '@/types/generation-status';

const useTrackPolling = (trackId: string) => {
  const { data: track } = useQuery({
    queryKey: ['track', trackId],
    queryFn: () => fetchTrack(trackId),
    refetchInterval: (data) => {
      if (!data) return false;
      const status = data.status as TrackGenerationStatus;
      return isInProgress(status) ? 5000 : false;
    },
  });
  
  const showProgress = useMemo(() => 
    track && shouldShowProgress(track.status as TrackGenerationStatus),
    [track]
  );
  
  return { track, showProgress };
};
```

### Пример 4: Нормализация legacy данных

```typescript
import { normalizeStatus } from '@/types/generation-status';

// При получении данных из базы
const track = await supabase
  .from('tracks')
  .select('*')
  .eq('id', trackId)
  .single();

// Нормализуем статус для использования в приложении
const normalizedTrack = {
  ...track,
  status: normalizeStatus(track.status)
};
```

---

## 🔍 Категории статусов

Для удобной фильтрации и группировки:

```typescript
export const STATUS_CATEGORIES = {
  // Треки в процессе генерации
  IN_PROGRESS: ['pending', 'preparing', 'queued', 'processing'],
  
  // Финальные статусы (генерация завершена)
  FINAL: ['completed', 'failed', 'cancelled', 'timeout'],
  
  // Ошибочные статусы
  ERROR: ['failed', 'cancelled', 'timeout'],
  
  // Успешные статусы
  SUCCESS: ['completed'],
};
```

---

## 🎯 Best Practices

1. **Всегда используйте утилиты**: Вместо прямого сравнения статусов используйте утилиты типа `isInProgress()`, `canRetry()` и т.д.

2. **Нормализуйте данные из API**: Всегда применяйте `normalizeStatus()` к данным из базы данных для обеспечения совместимости.

3. **Валидируйте переходы**: При изменении статуса используйте `isValidTransition()` для проверки валидности.

4. **Используйте метаданные для UI**: Не дублируйте логику отображения, используйте `getStatusMetadata()`.

5. **Типизация**: Везде используйте `TrackGenerationStatus` вместо строковых литералов.

---

## 🚀 Миграция с legacy системы

### До (legacy):

```typescript
// ❌ Плохо: прямое сравнение строк, нет типобезопасности
if (track.status === 'processing' || track.status === 'pending') {
  // show spinner
}

// ❌ Плохо: дублирование логики
const badgeColor = track.status === 'completed' ? 'success' : 
                   track.status === 'failed' ? 'destructive' : 'default';
```

### После (unified system):

```typescript
// ✅ Хорошо: типобезопасно, использование утилит
import { isInProgress, getStatusBadgeVariant } from '@/types/generation-status';

if (isInProgress(track.status as TrackGenerationStatus)) {
  // show spinner
}

// ✅ Хорошо: централизованная логика
const badgeVariant = getStatusBadgeVariant(track.status as TrackGenerationStatus);
```

---

## 📝 Примечания

- Система полностью типобезопасна при использовании TypeScript
- Все legacy статусы автоматически маппятся в новую систему
- Метаданные можно легко расширять под нужды проекта
- Валидация переходов помогает избежать недопустимых состояний
