/**
 * @file TrackCardMobile.tsx
 * @description Оптимизированная карточка трека для мобильных устройств
 * 
 * Особенности:
 * - Компактный горизонтальный layout (обложка слева, инфо справа)
 * - Touch-friendly кнопки (минимум 44x44px)
 * - Контекстное меню с полным набором действий
 * - Визуальные индикаторы состояния (играет, загружается, ошибка)
 * - Оптимизация производительности через React.memo
 * 
 * @version 2.1.0
 */
import React, { useCallback, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LazyImage } from '@/components/ui/lazy-image';
import { Play, Pause, Heart } from '@/utils/iconImports';
import { TrackStatusBadge } from '@/components/tracks/TrackStatusBadge';
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useTrackLike } from '@/features/tracks/hooks';
import { formatDuration } from '@/utils/formatters';
import { cn } from '@/lib/utils';
import { TrackContextMenu } from '@/features/tracks/components/TrackContextMenu';
import type { TrackStatus } from '@/components/tracks/track-status.types';
import type { Track } from '@/types/domain/track.types';

/**
 * Props для мобильной карточки трека
 * 
 * @property track - Данные трека из БД
 * @property onClick - Обработчик клика по карточке (открытие детальной панели)
 * @property onDelete - Callback удаления трека
 * @property onExtend - Callback продления трека (Suno only)
 * @property onCover - Callback создания кавера (Suno only)
 * @property onSeparateStems - Callback разделения на стемы
 * @property onAddVocal - Callback добавления вокала
 * @property onDescribeTrack - Callback AI-описания (Mureka only)
 * @property onCreatePersona - Callback создания персоны (Suno only)
 * @property onRetry - Callback повтора генерации при ошибке
 */
interface TrackCardMobileProps {
  track: Track;
  onClick?: () => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  onDescribeTrack?: (trackId: string) => void;
  onCreatePersona?: (trackId: string) => void;
  onRetry?: (trackId: string) => void;
}

/**
 * Мобильная карточка трека
 * 
 * Мемоизирована для предотвращения лишних ререндеров
 * Использует Zustand store для управления плеером
 */
export const TrackCardMobile = memo(({ 
  track, 
  onClick,
  onDelete,
  onExtend,
  onCover,
  onSeparateStems,
  onAddVocal,
  onDescribeTrack,
  onCreatePersona,
  onRetry
}: TrackCardMobileProps) => {
  // ============= STATE & STORE =============
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);

  // ============= COMPUTED VALUES =============
  const isCurrentTrack = currentTrack?.id === track.id;
  const playButtonDisabled = track.status !== "completed" || !track.audio_url;

  // ============= EVENT HANDLERS =============
  
  /**
   * Обработчик воспроизведения/паузы
   * - Останавливает всплытие события чтобы не открывать детальную панель
   * - Если трек уже играет - переключает паузу
   * - Если другой трек - запускает новый
   */
  const handlePlayClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playButtonDisabled) return;
    
    if (isCurrentTrack) {
      // Текущий трек - просто переключаем паузу
      togglePlayPause();
    } else if (track.audio_url) {
      // Новый трек - запускаем воспроизведение
      playTrack({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        cover_url: track.cover_url || undefined,
        duration: track.duration || undefined,
        style_tags: track.style_tags || undefined,
        status: track.status !== 'draft' ? track.status : 'pending',
      });
    }
  }, [playButtonDisabled, togglePlayPause, playTrack, track, isCurrentTrack]);

  /**
   * Обработчик лайка
   * Использует оптимистичное обновление через useTrackLike hook
   */
  const handleLikeClick = useCallback(() => {
    toggleLike();
  }, [toggleLike]);

  // ============= RENDER =============
  return (
    <TrackContextMenu
      track={track}
      onPlay={() => handlePlayClick({} as React.MouseEvent<Element>)}
      onLike={() => handleLikeClick()}
      onDelete={onDelete ? () => onDelete(track.id) : undefined}
      onExtend={onExtend ? () => onExtend(track.id) : undefined}
      onCover={onCover ? () => onCover(track.id) : undefined}
      onSeparateStems={onSeparateStems ? () => onSeparateStems(track.id) : undefined}
      onAddVocal={onAddVocal ? () => onAddVocal(track.id) : undefined}
      onDescribeTrack={onDescribeTrack ? () => onDescribeTrack(track.id) : undefined}
      onCreatePersona={onCreatePersona ? () => onCreatePersona(track.id) : undefined}
      onRetry={onRetry ? () => onRetry(track.id) : undefined}
      isLiked={isLiked}
      enableAITools={true}
    >
      {/* 
        Карточка трека:
        - Градиентный фон для глубины
        - Hover эффекты с тенью
        - Ring вокруг текущего трека
        - Backdrop blur для премиум вида
      */}
      <Card
        onClick={onClick}
        className={cn(
          "overflow-hidden hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300 cursor-pointer",
          "border border-border/50 hover:border-primary/50 backdrop-blur-sm",
          "min-h-[100px] h-auto bg-gradient-to-br from-card via-card/95 to-card/90",
          "active:scale-[0.98]", // Touch feedback
          isCurrentTrack && "ring-2 ring-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]"
        )}
      >
      <div className="flex gap-3 p-3 sm:p-4">
        {/* ============= COVER IMAGE ============= */}
        {/* 
          Обложка трека:
          - Больше на мобильных (80px) для лучшей видимости
          - Gradient overlay снизу
          - Spinner для loading треков
          - Shadow для глубины
        */}
        <div className="relative w-20 h-20 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 shadow-lg group-hover:shadow-[0_0_15px_rgba(var(--primary),0.4)] transition-shadow duration-300">
          {/* Lazy loaded image с fallback */}
          <LazyImage
            src={track.cover_url || '/placeholder.svg'}
            alt={track.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            wrapperClassName="w-full h-full"
          />
          
          {/* Gradient overlay для читаемости */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Loading overlay для треков в процессе генерации */}
          {track.status !== 'completed' && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        
        {/* ============= TRACK INFO ============= */}
        {/* 
          Информация о треке:
          - Название (truncate 2 строки)
          - Status badge
          - Описание/промпт
          - Теги и длительность
        */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
          {/* Upper info section */}
          <div className="space-y-1.5">
            {/* Track title - max 2 lines */}
            <h3 className="text-base sm:text-sm font-semibold line-clamp-2 leading-tight text-foreground">
              {track.title}
            </h3>
            
            {/* Status badge - shows current state */}
            <div className="flex items-center gap-2">
              <TrackStatusBadge 
                status={track.status as TrackStatus}
                variant="compact"
                showIcon={true}
              />
            </div>
            
            {/* Prompt/description - 1 line */}
            {track.prompt && (
              <p className="text-xs text-muted-foreground/80 line-clamp-1 leading-relaxed">
                {track.prompt}
              </p>
            )}
            
            {/* Tags and duration - metadata row */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              {track.style_tags?.[0] && (
                <span className="truncate font-medium">{track.style_tags[0]}</span>
              )}
              {track.duration && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />
                  <span className="flex-shrink-0">{formatDuration(track.duration)}</span>
                </>
              )}
            </div>
          </div>
          
          {/* ============= ACTION BUTTONS ============= */}
          {/* 
            Touch-friendly кнопки:
            - Минимум 44x44px для удобного тапа
            - Play/Pause с визуальной обратной связью
            - Like с анимацией заполнения
          */}
          <div className="flex items-center gap-2">
            {/* Play/Pause Button */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-11 w-11 sm:h-9 sm:w-9 rounded-full transition-all duration-200",
                "bg-primary/10 hover:bg-primary/20 active:scale-95",
                isCurrentTrack && isPlaying && "bg-primary/20"
              )}
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
              aria-label={isCurrentTrack && isPlaying ? "Пауза" : "Воспроизвести"}
            >
              {isCurrentTrack && isPlaying ? (
                <Pause className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
              ) : (
                <Play className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
              )}
            </Button>
            
            {/* Like Button */}
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                "h-11 w-11 sm:h-9 sm:w-9 rounded-full transition-all duration-200",
                "hover:bg-red-500/10 active:scale-95",
                isLiked && "bg-red-500/10"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleLikeClick();
              }}
              aria-label={isLiked ? "Убрать из избранного" : "Добавить в избранное"}
            >
              <Heart 
                className={cn(
                  "h-5 w-5 sm:h-4 sm:w-4 transition-all duration-200", 
                  isLiked && "fill-red-500 text-red-500 scale-110"
                )} 
              />
            </Button>
          </div>
        </div>
      </div>
    </Card>
    </TrackContextMenu>
  );
});

// ============= COMPONENT NAME =============
// Для React DevTools
TrackCardMobile.displayName = 'TrackCardMobile';
