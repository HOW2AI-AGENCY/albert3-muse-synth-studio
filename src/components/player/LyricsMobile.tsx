/**
 * Мобильно-оптимизированный компонент синхронизированной лирики
 * - Увеличенный шрифт для комфортного чтения
 * - Swipe-жесты для навигации
 * - Pinch-to-zoom для масштабирования
 * - Haptic feedback
 * - Таймкоды строк
 * 
 * @version 2.0.0
 * @since 2025-11-06
 */

import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

interface LyricsMobileProps {
  timestampedLyrics: TimestampedWord[];
  currentTime: number;
  onSeek: (time: number) => void;
  togglePlayPause?: () => void;
  coverUrl?: string;
  className?: string;
  showControls?: boolean;
}

interface LyricLine {
  words: TimestampedWord[];
  startTime: number;
  endTime: number;
  text: string;
  id: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Группировка слов в строки (адаптивная для мобильных)
const groupWordsIntoLines = (words: TimestampedWord[]): LyricLine[] => {
  const lines: LyricLine[] = [];
  let currentLine: TimestampedWord[] = [];
  let wordCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentLine.push(word);
    wordCount++;

    const nextWord = words[i + 1];
    const pause = nextWord ? nextWord.startS - word.endS : 0;

    // Мобильная версия: меньше слов на строку для лучшей читаемости
    if (wordCount >= 6 && (pause > 0.5 || wordCount >= 10)) {
      lines.push({
        words: currentLine,
        startTime: currentLine[0].startS,
        endTime: currentLine[currentLine.length - 1].endS,
        text: currentLine.map((w) => w.word).join(' '),
        id: `line-${lines.length}`,
      });
      currentLine = [];
      wordCount = 0;
    }
  }

  if (currentLine.length > 0) {
    lines.push({
      words: currentLine,
      startTime: currentLine[0].startS,
      endTime: currentLine[currentLine.length - 1].endS,
      text: currentLine.map((w) => w.word).join(' '),
      id: `line-${lines.length}`,
    });
  }

  return lines;
};

export const LyricsMobile = React.memo<LyricsMobileProps>(
  ({
    timestampedLyrics,
    currentTime,
    onSeek,
    togglePlayPause,
    coverUrl,
    className,
    showControls = true,
  }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastScrolledIndexRef = useRef<number>(-1);
    const { vibrate } = useHapticFeedback();

    // Font scale для pinch-to-zoom
    const [fontScale, setFontScale] = useState(1);
    const [showTimecodes, setShowTimecodes] = useState(true);

    // Touch gesture states
    const touchStartX = useRef(0);
    const touchStartY = useRef(0);
    const touchStartDistance = useRef(0);
    const initialFontScale = useRef(1);

    const lines = useMemo(() => {
      if (!timestampedLyrics || timestampedLyrics.length === 0) {
        return [];
      }
      return groupWordsIntoLines(timestampedLyrics);
    }, [timestampedLyrics]);

    const activeLineIndex = useMemo(() => {
      return lines.findIndex(
        (line) => currentTime >= line.startTime && currentTime <= line.endTime
      );
    }, [lines, currentTime]);

    // ✅ FIX: Callback ref для установки активной строки
    const setActiveLineRef = useCallback((element: HTMLDivElement | null, index: number) => {
      if (index === activeLineIndex && element) {
        activeLineRef.current = element;
      }
    }, [activeLineIndex]);

    // ✅ FIX: Debounced плавный автоскролл с улучшенным easing
    useEffect(() => {
      // Скролл только если индекс изменился (не на каждый frame)
      if (activeLineIndex !== -1 && activeLineIndex !== lastScrolledIndexRef.current) {
        // Очистить предыдущий timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce scroll на 150ms чтобы избежать множественных scroll calls
        scrollTimeoutRef.current = setTimeout(() => {
          if (activeLineRef.current && containerRef.current) {
            const container = containerRef.current;
            const target = activeLineRef.current;
            const targetTop = target.offsetTop;
            const containerHeight = container.clientHeight;
            const scrollTo = targetTop - containerHeight / 2 + target.clientHeight / 2;

            // Плавный скролл
            container.scrollTo({
              top: scrollTo,
              behavior: 'smooth',
            });
            lastScrolledIndexRef.current = activeLineIndex;
          }
        }, 150);
      }

      // Cleanup on unmount
      return () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, [activeLineIndex]);

    // Touch handlers для жестов
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - swipe
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        // Pinch to zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
        initialFontScale.current = fontScale;
      }
    }, [fontScale]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // Pinch zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const scale = (distance / touchStartDistance.current) * initialFontScale.current;
        setFontScale(Math.max(0.8, Math.min(1.5, scale)));
      }
    }, []);

    const handleTouchEnd = useCallback(
      (e: React.TouchEvent) => {
        if (e.changedTouches.length === 1) {
          const touchEndX = e.changedTouches[0].clientX;
          const touchEndY = e.changedTouches[0].clientY;
          const dx = touchEndX - touchStartX.current;
          const dy = touchEndY - touchStartY.current;

          // Swipe horizontal для перемотки
          if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
            vibrate('light');
            if (dx > 0) {
              // Swipe right - rewind 5s
              onSeek(Math.max(0, currentTime - 5));
            } else {
              // Swipe left - forward 5s
              onSeek(currentTime + 5);
            }
          }
        }
      },
      [currentTime, onSeek, vibrate]
    );

    const handleDoubleClick = useCallback(() => {
      if (togglePlayPause) {
        vibrate('medium');
        togglePlayPause();
      }
    }, [togglePlayPause, vibrate]);

    const handleLineClick = useCallback(
      (time: number) => {
        vibrate('light');
        onSeek(time);
      },
      [onSeek, vibrate]
    );

    if (timestampedLyrics.length === 0) {
      return (
        <div className={cn('flex items-center justify-center h-full', className)}>
          <p className="text-sm text-muted-foreground">Текст недоступен</p>
        </div>
      );
    }

    return (
      <div className={cn('relative h-full overflow-hidden', className)}>
        {/* Затемненная обложка на фоне */}
        {coverUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={coverUrl}
              alt="Track cover"
              className="w-full h-full object-cover blur-3xl opacity-20 scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background/95" />
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTimecodes(!showTimecodes)}
              className="h-8 w-8 bg-background/50 backdrop-blur-sm"
            >
              {showTimecodes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Контейнер с текстом */}
        <div
          ref={containerRef}
          className="relative h-full overflow-y-auto py-8 px-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {lines.map((line, index) => {
              const isActive = index === activeLineIndex;
              const isPast = currentTime > line.endTime;
              const isFuture = currentTime < line.startTime;

              return (
                <div
                  key={line.id}
                  ref={(el) => setActiveLineRef(el, index)}
                  className={cn(
                    'transition-all duration-300 ease-out text-center',
                    'transform-gpu will-change-transform',
                    isActive && 'scale-110'
                  )}
                  onClick={() => handleLineClick(line.startTime)}
                >
                  {/* Таймкод */}
                  {showTimecodes && (
                    <div
                      className={cn(
                        'text-xs mb-2 transition-opacity duration-300',
                        isActive ? 'text-primary/80' : 'text-muted-foreground/40'
                      )}
                    >
                      {formatTime(line.startTime)}
                    </div>
                  )}

                  {/* Текст строки - увеличенный шрифт для мобильных */}
                  <div
                    className={cn(
                      'font-semibold leading-relaxed transition-all duration-300',
                      isActive &&
                        'text-primary drop-shadow-[0_0_20px_hsl(var(--primary)_/_0.5)]',
                      isPast && 'text-muted-foreground/40',
                      isFuture && 'text-muted-foreground/60'
                    )}
                    style={{
                      fontSize: `${fontScale * 1.5}rem`, // Base 1.5rem = 24px
                    }}
                  >
                    {line.words.map((word, wordIndex) => {
                      const isWordActive =
                        currentTime >= word.startS && currentTime <= word.endS;

                      return (
                        <span
                          key={`${line.id}-word-${wordIndex}`}
                          className={cn(
                            'inline-block transition-all duration-150',
                            isWordActive && isActive && 'text-accent font-bold scale-110'
                          )}
                        >
                          {word.word}{' '}
                        </span>
                      );
                    })}
                  </div>

                  {/* Прогресс-индикатор для активной строки */}
                  {isActive && (
                    <div className="mt-3 w-full max-w-xs mx-auto h-1 bg-primary/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-150 ease-linear"
                        style={{
                          width: `${Math.min(
                            100,
                            ((currentTime - line.startTime) / (line.endTime - line.startTime)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Padding для комфортного скролла */}
          <div className="h-32" />

          {/* Инструкция по жестам (показывается 1 раз) */}
          <div className="text-center text-xs text-muted-foreground/60 mt-4 space-y-1">
            <p>💡 Свайп влево/вправо - перемотка</p>
            <p>🔍 Pinch - масштабирование</p>
            <p>⏯️ Двойной тап - пауза</p>
          </div>
        </div>
      </div>
    );
  }
);

LyricsMobile.displayName = 'LyricsMobile';
