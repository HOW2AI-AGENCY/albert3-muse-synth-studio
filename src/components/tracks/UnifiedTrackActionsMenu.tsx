/**
 * ============================================================================
 * UNIFIED TRACK ACTIONS MENU
 * ============================================================================
 *
 * @file UnifiedTrackActionsMenu.tsx
 * @description Единый компонент меню действий для треков, работающий как:
 *              - Context Menu (правый клик)
 *              - Dropdown Menu (клик по кнопке)
 *
 * @features
 * - Полный набор действий (воспроизведение, лайк, скачивание, AI обработка)
 * - Адаптируется под разные треки (Suno/Mureka/другие провайдеры)
 * - Условное отображение действий в зависимости от статуса трека
 * - Поддержка версий треков
 * - Мобильно-оптимизированные касания (min 44x44px)
 * - Подробное логирование всех действий
 *
 * @version 3.0.0
 * @created 2025-11-28
 * @updated 2025-11-28
 *
 * @changelog
 * v3.0.0 - Объединение TrackContextMenu и TrackActionsMenu в единый компонент
 * v3.0.0 - Добавлено переключение версий напрямую из меню
 * v3.0.0 - Улучшенная обработка ошибок с подробным логированием
 * v3.0.0 - Мобильная оптимизация с увеличенными целями для касаний
 *
 * ============================================================================
 */

import { memo, useCallback, useMemo } from 'react';
import {
  Play,
  Heart,
  Download,
  Share2,
  Trash2,
  Music,
  Mic2,
  Sparkles,
  Copy,
  Globe,
  GlobeLock,
  RefreshCw,
  ImagePlus,
  Upload,
  User,
  MoreVertical,
} from 'lucide-react';

// UI Components
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

// Types
import type { Track } from '@/types/domain/track.types';

// Utils
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

/* ========================================================================
 * ТИПЫ И ИНТЕРФЕЙСЫ
 * ======================================================================== */

/**
 * Свойства компонента UnifiedTrackActionsMenu
 */
interface UnifiedTrackActionsMenuProps {
  /** Объект трека с полной информацией */
  track: Track;

  /** Дочерние элементы (для Context Menu) - если не указаны, рендерится Dropdown */
  children?: React.ReactNode;

  /** Режим отображения меню */
  mode?: 'context' | 'dropdown';

  /* ====== CALLBACKS ДЛЯ ДЕЙСТВИЙ ====== */

  /** Воспроизвести трек */
  onPlay?: () => void;

  /** Лайкнуть/разлайкнуть трек */
  onLike?: () => void;

  /** Скачать трек (может быть async для индикации загрузки) */
  onDownload?: () => void | Promise<void>;

  /** Поделиться треком */
  onShare?: () => void;

  /** Удалить трек (с подтверждением в родительском компоненте) */
  onDelete?: () => void;

  /** Продлить трек (Suno extend) */
  onExtend?: () => void;

  /** Создать кавер трека (Suno cover) */
  onCover?: () => void;

  /** Разделить на стемы (stems separation) */
  onSeparateStems?: () => void;

  /** Добавить вокал к инструментальному треку */
  onAddVocal?: () => void;

  /** Открыть панель деталей трека */
  onDescribeTrack?: () => void;

  /** Создать персону из трека */
  onCreatePersona?: () => void;

  /** Улучшить качество аудио */
  onUpscaleAudio?: () => void;

  /** Сгенерировать обложку */
  onGenerateCover?: () => void;

  /** Переключить публичность трека */
  onTogglePublic?: () => void;

  /** Повторить генерацию (для failed треков) */
  onRetry?: () => void;

  /** Переключить версию трека */
  onSwitchVersion?: () => void;

  /* ====== СОСТОЯНИЯ ====== */

  /** Трек лайкнут текущим пользователем */
  isLiked?: boolean;

  /** Включить AI инструменты */
  enableAITools?: boolean;

  /** Открыто ли меню (для Dropdown mode) */
  open?: boolean;

  /** Callback при изменении состояния открытия (для Dropdown mode) */
  onOpenChange?: (open: boolean) => void;

  /** Кастомный trigger для Dropdown (если не указан, используется кнопка с иконкой) */
  trigger?: React.ReactNode;

  /** Дополнительные CSS классы */
  className?: string;
}

/* ========================================================================
 * ОСНОВНОЙ КОМПОНЕНТ
 * ======================================================================== */

/**
 * UnifiedTrackActionsMenu - универсальное меню действий для треков
 *
 * Автоматически выбирает режим:
 * - Context Menu если переданы children
 * - Dropdown Menu если children не переданы
 *
 * @example Context Menu
 * <UnifiedTrackActionsMenu track={track} onPlay={handlePlay} onDelete={handleDelete}>
 *   <TrackCard track={track} />
 * </UnifiedTrackActionsMenu>
 *
 * @example Dropdown Menu
 * <UnifiedTrackActionsMenu track={track} mode="dropdown" onPlay={handlePlay} />
 */
const UnifiedTrackActionsMenuComponent = ({
  track,
  children,
  mode: propMode,
  onPlay,
  onLike,
  onDownload,
  onShare,
  onDelete,
  onExtend,
  onCover,
  onSeparateStems,
  onAddVocal,
  onDescribeTrack,
  onCreatePersona,
  onUpscaleAudio,
  onGenerateCover,
  onTogglePublic,
  onRetry,
  onSwitchVersion,
  isLiked = false,
  enableAITools = true,
  open,
  onOpenChange,
  trigger,
  className,
}: UnifiedTrackActionsMenuProps) => {

  /* ====================================================================
   * АВТООПРЕДЕЛЕНИЕ РЕЖИМА
   * ==================================================================== */

  /**
   * Режим работы меню:
   * - 'context' если есть children
   * - 'dropdown' если children нет
   * - propMode если явно указан
   */
  const mode = propMode || (children ? 'context' : 'dropdown');

  /* ====================================================================
   * МЕМОИЗИРОВАННЫЕ ЗНАЧЕНИЯ
   * ==================================================================== */

  /**
   * Проверка доступности трека для воспроизведения
   * Трек можно воспроизвести если:
   * - Статус 'completed'
   * - Есть audio_url
   */
  const isPlayable = useMemo(() => {
    return track.status === 'completed' && !!track.audio_url;
  }, [track.status, track.audio_url]);

  /**
   * Проверка возможности использования AI инструментов
   * AI инструменты доступны если:
   * - enableAITools === true
   * - Трек завершен (status === 'completed')
   */
  const canUseAITools = useMemo(() => {
    return enableAITools && track.status === 'completed';
  }, [enableAITools, track.status]);

  /**
   * Проверка поддержки Suno-специфичных функций
   * Suno функции (extend, cover, persona) доступны только для Suno треков
   */
  const isSunoTrack = useMemo(() => {
    return track.provider === 'suno';
  }, [track.provider]);

  /**
   * Проверка поддержки Mureka-специфичных функций
   */
  const isMurekaTrack = useMemo(() => {
    return track.provider === 'mureka';
  }, [track.provider]);

  /* ====================================================================
   * ОБРАБОТЧИКИ ДЕЙСТВИЙ С ЛОГИРОВАНИЕМ
   * ==================================================================== */

  /**
   * Обертка для безопасного выполнения действий
   * - Останавливает всплытие события
   * - Логирует выполнение действия
   * - Обрабатывает ошибки
   * - Закрывает меню после выполнения
   *
   * @param actionName - Название действия для логирования
   * @param callback - Функция обратного вызова для выполнения
   */
  const handleAction = useCallback((
    actionName: string,
    callback?: () => void | Promise<void>
  ) => {
    return async (e: React.MouseEvent) => {
      // Останавливаем всплытие, чтобы не срабатывали обработчики родителей
      e.stopPropagation();
      e.preventDefault();

      if (!callback) {
        logger.warn(`No callback provided for action: ${actionName}`, 'UnifiedTrackActionsMenu', {
          trackId: track.id,
          trackTitle: track.title,
          action: actionName,
        });
        return;
      }

      try {
        logger.info(`Executing action: ${actionName}`, 'UnifiedTrackActionsMenu', {
          trackId: track.id,
          trackTitle: track.title,
          action: actionName,
        });

        // Выполняем callback (может быть async)
        await callback();

        logger.info(`Action completed: ${actionName}`, 'UnifiedTrackActionsMenu', {
          trackId: track.id,
          action: actionName,
        });
      } catch (error) {
        // Логируем ошибку, но не пробрасываем, чтобы меню закрылось
        logger.error(`Action failed: ${actionName}`, error as Error, 'UnifiedTrackActionsMenu', {
          trackId: track.id,
          trackTitle: track.title,
          action: actionName,
        });
      } finally {
        // Закрываем меню после действия (для dropdown mode)
        onOpenChange?.(false);
      }
    };
  }, [track.id, track.title, onOpenChange]);

  /* ====================================================================
   * РЕНДЕР ЭЛЕМЕНТОВ МЕНЮ
   * ==================================================================== */

  /**
   * Рендер содержимого меню
   * Одинаковое для Context и Dropdown режимов
   *
   * @param MenuItem - Компонент элемента меню (ContextMenuItem или DropdownMenuItem)
   * @param MenuSeparator - Компонент разделителя
   * @param MenuSub - Компонент подменю
   * @param MenuSubTrigger - Компонент триггера подменю
   * @param MenuSubContent - Компонент содержимого подменю
   */
  const renderMenuContent = (
    MenuItem: typeof ContextMenuItem | typeof DropdownMenuItem,
    MenuSeparator: typeof ContextMenuSeparator | typeof DropdownMenuSeparator,
    MenuSub: typeof ContextMenuSub | typeof DropdownMenuSub,
    MenuSubTrigger: typeof ContextMenuSubTrigger | typeof DropdownMenuSubTrigger,
    MenuSubContent: typeof ContextMenuSubContent | typeof DropdownMenuSubContent,
  ) => (
    <>
      {/* ============================================================
       * ОСНОВНЫЕ ДЕЙСТВИЯ
       * ============================================================ */}

      {/* Воспроизвести */}
      {onPlay && isPlayable && (
        <>
          <MenuItem onClick={handleAction('play', onPlay)}>
            <Play className="mr-2 h-4 w-4" />
            Воспроизвести
          </MenuItem>
          <MenuSeparator />
        </>
      )}

      {/* Лайк */}
      {onLike && (
        <MenuItem onClick={handleAction('like', onLike)}>
          <Heart className={cn(
            "mr-2 h-4 w-4",
            isLiked && "fill-current text-red-500"
          )} />
          {isLiked ? 'Убрать из избранного' : 'Добавить в избранное'}
        </MenuItem>
      )}

      {/* Скачать */}
      {onDownload && isPlayable && (
        <MenuItem onClick={handleAction('download', onDownload)}>
          <Download className="mr-2 h-4 w-4" />
          Скачать
        </MenuItem>
      )}

      {/* Поделиться */}
      {onShare && (
        <MenuItem onClick={handleAction('share', onShare)}>
          <Share2 className="mr-2 h-4 w-4" />
          Поделиться
        </MenuItem>
      )}

      {/* ============================================================
       * ВЕРСИИ ТРЕКА
       * ============================================================ */}

      {/* Переключить версию */}
      {onSwitchVersion && (
        <>
          <MenuSeparator />
          <MenuItem onClick={handleAction('switchVersion', onSwitchVersion)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Сменить версию
          </MenuItem>
        </>
      )}

      {/* ============================================================
       * AI ОБРАБОТКА (ПОДМЕНЮ)
       * ============================================================ */}

      {canUseAITools && (onExtend || onCover || onSeparateStems || onAddVocal || onUpscaleAudio || onGenerateCover) && (
        <>
          <MenuSeparator />
          <MenuSub>
            <MenuSubTrigger>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Обработка
            </MenuSubTrigger>
            <MenuSubContent>
              {/* Продлить трек (только Suno) */}
              {onExtend && isSunoTrack && (
                <MenuItem onClick={handleAction('extend', onExtend)}>
                  <Music className="mr-2 h-4 w-4" />
                  Продлить трек
                </MenuItem>
              )}

              {/* Создать кавер (только Suno) */}
              {onCover && isSunoTrack && (
                <MenuItem onClick={handleAction('cover', onCover)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Создать кавер
                </MenuItem>
              )}

              {/* Разделить на стемы */}
              {onSeparateStems && (
                <MenuItem onClick={handleAction('separateStems', onSeparateStems)}>
                  <Music className="mr-2 h-4 w-4" />
                  Разделить на стемы
                </MenuItem>
              )}

              {/* Добавить вокал (только если нет вокала) */}
              {onAddVocal && !track.has_vocals && (
                <MenuItem onClick={handleAction('addVocal', onAddVocal)}>
                  <Mic2 className="mr-2 h-4 w-4" />
                  Добавить вокал
                </MenuItem>
              )}

              {/* Улучшить качество */}
              {onUpscaleAudio && (
                <MenuItem onClick={handleAction('upscaleAudio', onUpscaleAudio)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Улучшить качество
                </MenuItem>
              )}

              {/* Сгенерировать обложку */}
              {onGenerateCover && (
                <MenuItem onClick={handleAction('generateCover', onGenerateCover)}>
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Создать обложку
                </MenuItem>
              )}
            </MenuSubContent>
          </MenuSub>
        </>
      )}

      {/* ============================================================
       * АНАЛИЗ (ПОДМЕНЮ)
       * ============================================================ */}

      {(onDescribeTrack || onCreatePersona) && (
        <>
          <MenuSeparator />
          <MenuSub>
            <MenuSubTrigger>
              <Sparkles className="mr-2 h-4 w-4" />
              Анализ
            </MenuSubTrigger>
            <MenuSubContent>
              {/* AI описание (только Mureka) */}
              {onDescribeTrack && isMurekaTrack && (
                <MenuItem onClick={handleAction('describeTrack', onDescribeTrack)}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI описание
                </MenuItem>
              )}

              {/* Создать персону (только Suno) */}
              {onCreatePersona && isSunoTrack && (
                <MenuItem onClick={handleAction('createPersona', onCreatePersona)}>
                  <User className="mr-2 h-4 w-4" />
                  Создать персону
                </MenuItem>
              )}
            </MenuSubContent>
          </MenuSub>
        </>
      )}

      {/* ============================================================
       * НАСТРОЙКИ
       * ============================================================ */}

      {/* Публичность */}
      {onTogglePublic && (
        <>
          <MenuSeparator />
          <MenuItem onClick={handleAction('togglePublic', onTogglePublic)}>
            {track.is_public ? (
              <>
                <GlobeLock className="mr-2 h-4 w-4" />
                Сделать приватным
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Опубликовать
              </>
            )}
          </MenuItem>
        </>
      )}

      {/* ============================================================
       * ОБРАБОТКА ОШИБОК
       * ============================================================ */}

      {/* Повторить генерацию (для failed треков) */}
      {onRetry && track.status === 'failed' && (
        <>
          <MenuSeparator />
          <MenuItem onClick={handleAction('retry', onRetry)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Повторить генерацию
          </MenuItem>
        </>
      )}

      {/* ============================================================
       * УДАЛЕНИЕ (ОПАСНАЯ ЗОНА)
       * ============================================================ */}

      {/* Удалить */}
      {onDelete && (
        <>
          <MenuSeparator />
          <MenuItem
            onClick={handleAction('delete', onDelete)}
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
          </MenuItem>
        </>
      )}
    </>
  );

  /* ====================================================================
   * РЕНДЕР МЕНЮ В ЗАВИСИМОСТИ ОТ РЕЖИМА
   * ==================================================================== */

  // Context Menu Mode (правый клик)
  if (mode === 'context' && children) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className={cn("w-56", className)}>
          {renderMenuContent(
            ContextMenuItem,
            ContextMenuSeparator,
            ContextMenuSub,
            ContextMenuSubTrigger,
            ContextMenuSubContent,
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  // Dropdown Menu Mode (клик по кнопке)
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 min-h-[44px] min-w-[44px] touch-target-min"
            onClick={(e) => e.stopPropagation()}
            aria-label="Открыть меню действий трека"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-56", className)}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {renderMenuContent(
          DropdownMenuItem,
          DropdownMenuSeparator,
          DropdownMenuSub,
          DropdownMenuSubTrigger,
          DropdownMenuSubContent,
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ========================================================================
 * EXPORT
 * ======================================================================== */

/**
 * Мемоизированный компонент для оптимизации ре-рендеров
 */
export const UnifiedTrackActionsMenu = memo(UnifiedTrackActionsMenuComponent);

UnifiedTrackActionsMenu.displayName = 'UnifiedTrackActionsMenu';
