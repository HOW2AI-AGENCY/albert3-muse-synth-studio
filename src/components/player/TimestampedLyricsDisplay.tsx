/**
 * Улучшенный компонент синхронизированной лирики
 * - Затемнение обложки трека на фоне
 * - Подсветка текущей строки с анимацией
 * - Плавная синхронизация с музыкой
 * - Группировка слов в строки для лучшей читаемости
 *
 * @version 2.0.0
 * @since 2025-11-05
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';

interface TimestampedLyricsDisplayProps {
  timestampedLyrics: TimestampedWord[];
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
  coverUrl?: string; // Обложка трека для фона
}

// Группируем слова в строки для лучшего отображения
interface LyricLine {
  words: TimestampedWord[];
  startTime: number;
  endTime: number;
  text: string;
}

// Группируем слова в строки
const groupWordsIntoLines = (words: TimestampedWord[]): LyricLine[] => {
  const lines: LyricLine[] = [];
  let currentLine: TimestampedWord[] = [];
  let wordCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    currentLine.push(word);
    wordCount++;

    // Новая строка каждые ~8-12 слов или при длинной паузе
    const nextWord = words[i + 1];
    const pause = nextWord ? nextWord.startS - word.endS : 0;

    if (wordCount >= 8 && (pause > 0.5 || wordCount >= 12)) {
      lines.push({
        words: currentLine,
        startTime: currentLine[0].startS,
        endTime: currentLine[currentLine.length - 1].endS,
        text: currentLine.map((w) => w.word).join(' '),
      });
      currentLine = [];
      wordCount = 0;
    }
  }

  // Добавляем оставшиеся слова
  if (currentLine.length > 0) {
    lines.push({
      words: currentLine,
      startTime: currentLine[0].startS,
      endTime: currentLine[currentLine.length - 1].endS,
      text: currentLine.map((w) => w.word).join(' '),
    });
  }

  return lines;
};

export const TimestampedLyricsDisplay = React.memo<TimestampedLyricsDisplayProps>(
  ({ timestampedLyrics, currentTime, onSeek, className, coverUrl }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeLineRef = useRef<HTMLDivElement | null>(null);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastScrolledIndexRef = useRef<number>(-1);

    // Группируем слова в строки
    const lines = useMemo(() => {
      if (!timestampedLyrics || timestampedLyrics.length === 0) {
        return [];
      }
      return groupWordsIntoLines(timestampedLyrics);
    }, [timestampedLyrics]);

    // Находим активную строку
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

    // ✅ FIX: Debounced автоскролл к активной строке
    useEffect(() => {
      // Скролл только если индекс изменился (не на каждый frame)
      if (activeLineIndex !== -1 && activeLineIndex !== lastScrolledIndexRef.current) {
        // Очистить предыдущий timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        // Debounce scroll на 150ms чтобы избежать множественных scroll calls
        scrollTimeoutRef.current = setTimeout(() => {
          if (activeLineRef.current) {
            activeLineRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
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

        {/* Контейнер с текстом */}
        <div
          ref={containerRef}
          className="relative h-full overflow-y-auto py-8 px-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-primary/20"
        >
          <div className="max-w-2xl mx-auto space-y-6">
            {lines.map((line, index) => {
              const isActive = index === activeLineIndex;
              const isPast = currentTime > line.endTime;
              const isFuture = currentTime < line.startTime;

              return (
                <div
                  key={index}
                  ref={(el) => setActiveLineRef(el, index)}
                  className={cn(
                    'transition-all duration-300 ease-out text-center',
                    'transform-gpu will-change-transform',
                    isActive && 'scale-110'
                  )}
                >
                  {/* Текст строки */}
                  <div
                    className={cn(
                      'text-xl sm:text-2xl md:text-3xl font-semibold leading-relaxed',
                      'transition-all duration-300',
                      isActive &&
                        'text-primary drop-shadow-[0_0_20px_hsl(var(--primary)_/_0.5)]',
                      isPast && 'text-muted-foreground/40',
                      isFuture && 'text-muted-foreground/60'
                    )}
                  >
                    {line.words.map((word, wordIndex) => {
                      const isWordActive =
                        currentTime >= word.startS && currentTime <= word.endS;

                      return (
                        <span
                          key={wordIndex}
                          onClick={() => onSeek(word.startS)}
                          className={cn(
                            'inline-block transition-all duration-150 cursor-pointer',
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
        </div>
      </div>
    );
  }
);

TimestampedLyricsDisplay.displayName = 'TimestampedLyricsDisplay';
