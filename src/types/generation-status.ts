/**
 * Unified Generation Status System
 * Sprint 37: Generation System Audit
 * 
 * Централизованная система статусов генерации треков
 * с типобезопасностью и утилитами для работы со статусами
 */

// ============================================================================
// CORE STATUS TYPES
// ============================================================================

/**
 * Основные статусы генерации трека
 */
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

/**
 * Статусы публикации трека
 */
export type TrackPublicationStatus = 
  | 'private'     // Приватный трек
  | 'workspace'   // Доступен в workspace
  | 'public'      // Публичный трек
  | 'deleted';    // Удален

/**
 * Комплексный статус трека (генерация + публикация)
 */
export interface TrackStatus {
  generation: TrackGenerationStatus;
  publication: TrackPublicationStatus;
  errorMessage?: string;
  retryCount?: number;
  lastUpdated: Date;
}

// ============================================================================
// STATUS CATEGORIES
// ============================================================================

/**
 * Категории статусов для UI логики
 */
export const STATUS_CATEGORIES = {
  IN_PROGRESS: ['pending', 'preparing', 'queued', 'processing'] as const,
  FINAL: ['completed', 'failed', 'cancelled', 'timeout'] as const,
  ERROR: ['failed', 'cancelled', 'timeout'] as const,
  SUCCESS: ['completed'] as const,
} as const;

// ============================================================================
// STATUS METADATA
// ============================================================================

/**
 * Метаданные статусов для UI
 */
export interface StatusMetadata {
  label: string;
  description: string;
  color: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  icon?: string;
  canRetry: boolean;
  canCancel: boolean;
  showProgress: boolean;
}

export const STATUS_METADATA: Record<TrackGenerationStatus, StatusMetadata> = {
  draft: {
    label: 'Черновик',
    description: 'Трек создан, генерация не начата',
    color: 'secondary',
    canRetry: false,
    canCancel: false,
    showProgress: false,
  },
  pending: {
    label: 'Ожидает',
    description: 'Трек ожидает начала генерации',
    color: 'default',
    canRetry: false,
    canCancel: true,
    showProgress: true,
  },
  preparing: {
    label: 'Подготовка',
    description: 'Подготовка к генерации',
    color: 'primary',
    canRetry: false,
    canCancel: true,
    showProgress: true,
  },
  queued: {
    label: 'В очереди',
    description: 'Трек в очереди на обработку',
    color: 'default',
    canRetry: false,
    canCancel: true,
    showProgress: true,
  },
  processing: {
    label: 'Генерация',
    description: 'Идет активная генерация трека',
    color: 'primary',
    canRetry: false,
    canCancel: true,
    showProgress: true,
  },
  completed: {
    label: 'Готово',
    description: 'Трек успешно сгенерирован',
    color: 'success',
    canRetry: false,
    canCancel: false,
    showProgress: false,
  },
  failed: {
    label: 'Ошибка',
    description: 'Произошла ошибка генерации',
    color: 'destructive',
    canRetry: true,
    canCancel: false,
    showProgress: false,
  },
  cancelled: {
    label: 'Отменено',
    description: 'Генерация отменена пользователем',
    color: 'secondary',
    canRetry: true,
    canCancel: false,
    showProgress: false,
  },
  timeout: {
    label: 'Таймаут',
    description: 'Превышен таймаут генерации',
    color: 'warning',
    canRetry: true,
    canCancel: false,
    showProgress: false,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Проверяет, находится ли трек в процессе генерации
 */
export function isInProgress(status: TrackGenerationStatus): boolean {
  return STATUS_CATEGORIES.IN_PROGRESS.includes(status as any);
}

/**
 * Проверяет, является ли статус финальным
 */
export function isFinal(status: TrackGenerationStatus): boolean {
  return STATUS_CATEGORIES.FINAL.includes(status as any);
}

/**
 * Проверяет, является ли статус ошибочным
 */
export function isError(status: TrackGenerationStatus): boolean {
  return STATUS_CATEGORIES.ERROR.includes(status as any);
}

/**
 * Проверяет, успешно ли завершена генерация
 */
export function isSuccess(status: TrackGenerationStatus): boolean {
  return STATUS_CATEGORIES.SUCCESS.includes(status as any);
}

/**
 * Можно ли повторить генерацию для данного статуса
 */
export function canRetry(status: TrackGenerationStatus): boolean {
  return STATUS_METADATA[status].canRetry;
}

/**
 * Можно ли отменить генерацию для данного статуса
 */
export function canCancel(status: TrackGenerationStatus): boolean {
  return STATUS_METADATA[status].canCancel;
}

/**
 * Нужно ли показывать прогресс для данного статуса
 */
export function shouldShowProgress(status: TrackGenerationStatus): boolean {
  return STATUS_METADATA[status].showProgress;
}

/**
 * Получает метаданные для статуса
 */
export function getStatusMetadata(status: TrackGenerationStatus): StatusMetadata {
  return STATUS_METADATA[status];
}

/**
 * Нормализует статус из базы данных к типу TrackGenerationStatus
 * Обеспечивает обратную совместимость с legacy статусами
 */
export function normalizeStatus(rawStatus: string | null | undefined): TrackGenerationStatus {
  if (!rawStatus) return 'draft';
  
  const normalized = rawStatus.toLowerCase().trim();
  
  // Прямое соответствие
  if (normalized in STATUS_METADATA) {
    return normalized as TrackGenerationStatus;
  }
  
  // Legacy mapping
  switch (normalized) {
    case 'ready':
    case 'published':
      return 'completed';
    case 'error':
      return 'failed';
    case 'waiting':
      return 'pending';
    default:
      console.warn(`Unknown track status: ${rawStatus}, defaulting to 'draft'`);
      return 'draft';
  }
}

/**
 * Получает цвет для badge компонента на основе статуса
 */
export function getStatusBadgeVariant(
  status: TrackGenerationStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const metadata = STATUS_METADATA[status];
  
  switch (metadata.color) {
    case 'destructive':
    case 'warning':
      return 'destructive';
    case 'success':
    case 'primary':
      return 'default';
    case 'secondary':
    default:
      return 'secondary';
  }
}

/**
 * Форматирует статус для отображения пользователю
 */
export function formatStatusForDisplay(status: TrackGenerationStatus): string {
  return STATUS_METADATA[status].label;
}

/**
 * Получает описание статуса
 */
export function getStatusDescription(status: TrackGenerationStatus): string {
  return STATUS_METADATA[status].description;
}

// ============================================================================
// STATUS TRANSITION VALIDATION
// ============================================================================

/**
 * Валидные переходы между статусами
 */
const VALID_TRANSITIONS: Record<TrackGenerationStatus, TrackGenerationStatus[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['preparing', 'queued', 'processing', 'failed', 'cancelled'],
  preparing: ['queued', 'processing', 'failed', 'cancelled'],
  queued: ['processing', 'failed', 'cancelled', 'timeout'],
  processing: ['completed', 'failed', 'cancelled', 'timeout'],
  completed: [],
  failed: ['pending'],
  cancelled: ['pending'],
  timeout: ['pending'],
};

/**
 * Проверяет, валиден ли переход из одного статуса в другой
 */
export function isValidTransition(
  from: TrackGenerationStatus,
  to: TrackGenerationStatus
): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

/**
 * Получает список возможных следующих статусов
 */
export function getNextValidStatuses(status: TrackGenerationStatus): TrackGenerationStatus[] {
  return VALID_TRANSITIONS[status];
}
