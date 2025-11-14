import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGesture } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';
import type { LyricsSettings } from './LyricsSettingsDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimestampedLyricsDisplayProps {
  lyricsData: TimestampedWord[];
  currentTime: number;
  className?: string;
  settings?: LyricsSettings;
  onSeek?: (time: number) => void;
  onTogglePlayPause?: () => void;
}

interface LyricLine {
  id: number;
  words: TimestampedWord[];
  startTime: number;
  endTime: number;
}

const TimestampedLyricsDisplay: React.FC<TimestampedLyricsDisplayProps> = ({
  lyricsData,
  currentTime,
  className,
  settings = { fontSize: 'medium', scrollSpeed: 5, disableWordHighlight: false, highContrast: false },
  onSeek,
  onTogglePlayPause,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedLineIndex, setFocusedLineIndex] = useState<number>(-1);
  const lastTapRef = useRef<number>(0);

  useEffect(() => {
    // Removed redundant global keydown listener to avoid referencing undeclared vars
    // Keyboard handling is implemented via handleKeyDown below
  }, []);

  // Font size state and classes
  const [fontSize, setFontSize] = useState<number>(1.5);
  const fontSizeClasses = useMemo(() => {
    switch (settings.fontSize) {
      case 'small':
        return 'text-base sm:text-lg';
      case 'large':
        return 'text-2xl sm:text-3xl';
      default:
        return 'text-xl sm:text-2xl';
    }
  }, [settings.fontSize]);

  useEffect(() => {
    const size = settings.fontSize === 'small' ? 1 : settings.fontSize === 'large' ? 2 : 1.5;
    setFontSize(size);
  }, [settings.fontSize]);

  const bind = useGesture({
    onDoubleClick: () => {
      onTogglePlayPause?.();
    },
    onPinch: ({ offset: [d] }) => {
      const newFontSize = Math.max(0.5, Math.min(3, d));
      setFontSize(newFontSize);
    },
    onDrag: ({ scrolling, delta: [, dy], direction: [, yDir] }) => {
      if (scrolling) {
        const scrollContainer = scrollRef.current?.closest('[data-radix-scroll-area-viewport]') as HTMLElement;
        if (scrollContainer) {
          scrollContainer.scrollTop += dy * yDir;
        }
      }
    },
  });

  const lines: LyricLine[] = useMemo(() => {
    if (!lyricsData) return [];
    const result: LyricLine[] = [];
    let currentLine: TimestampedWord[] = [];
    lyricsData.forEach((word) => {
      if (word.word === '\n') {
        if (currentLine.length > 0) {
          result.push({
            id: result.length,
            words: currentLine,
            startTime: currentLine[0].startS,
            endTime: currentLine[currentLine.length - 1].endS,
          });
          currentLine = [];
        }
      } else {
        currentLine.push(word);
      }
    });
    if (currentLine.length > 0) {
      result.push({
        id: result.length,
        words: currentLine,
        startTime: currentLine[0].startS,
        endTime: currentLine[currentLine.length - 1].endS,
      });
    }
    return result;
  }, [lyricsData]);

  const activeLineIndex = useMemo(() => {
    return lines.findIndex(line => currentTime >= line.startTime && currentTime <= line.endTime);
  }, [lines, currentTime]);

  useEffect(() => {
    if (activeLineIndex === -1 || !scrollRef.current) return;

    const activeElement = scrollRef.current.querySelector<HTMLElement>(
      `[data-line-index="${activeLineIndex}"]`
    );

    if (!activeElement) return;

    const viewport = scrollRef.current.closest('[data-radix-scroll-area-viewport]') as HTMLElement;

    if (viewport) {
      const elementRect = activeElement.getBoundingClientRect();
      const viewportRect = viewport.getBoundingClientRect();
      const relativeTop = elementRect.top - viewportRect.top + viewport.scrollTop;

      const targetScroll = relativeTop - viewport.offsetHeight / 2 + activeElement.offsetHeight / 2;

      viewport.scrollTo({
        top: targetScroll,
        behavior: settings.scrollSpeed > 7 ? 'auto' : 'smooth',
      });
    } else {
      // Fallback for non-ScrollArea environments
      activeElement.scrollIntoView({
        behavior: settings.scrollSpeed > 7 ? 'auto' : 'smooth',
        block: 'center',
      });
    }
  }, [activeLineIndex, settings.scrollSpeed]);

  // ✅ P1 FIX: Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Don't interfere with input fields
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab - previous line
          setFocusedLineIndex(prev => Math.max(0, prev - 1));
        } else {
          // Tab - next line
          setFocusedLineIndex(prev => Math.min(lines.length - 1, prev + 1));
        }
        break;
      case 'Enter':
        // Enter - seek to focused line
        if (focusedLineIndex >= 0 && focusedLineIndex < lines.length && onSeek) {
          e.preventDefault();
          onSeek(lines[focusedLineIndex].startTime);
        }
        break;
      case 'ArrowUp':
        // Arrow Up - scroll up
        e.preventDefault();
        setFocusedLineIndex(prev => Math.max(0, prev - 1));
        break;
      case 'ArrowDown':
        // Arrow Down - scroll down
        e.preventDefault();
        setFocusedLineIndex(prev => Math.min(lines.length - 1, prev + 1));
        break;
      case ' ':
      case 'Spacebar':
        // Space - play/pause
        if (onTogglePlayPause) {
          e.preventDefault();
          onTogglePlayPause();
        }
        break;
      case 'Escape':
        // Escape - clear focus
        e.preventDefault();
        setFocusedLineIndex(-1);
        break;
    }
  }, [focusedLineIndex, lines, onSeek, onTogglePlayPause]);

  // ✅ P1 FIX: Double tap to play/pause
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      e.preventDefault();
      if (onTogglePlayPause) {
        onTogglePlayPause();
      }
    }

    lastTapRef.current = now;
  }, [onTogglePlayPause]);

  // ✅ P1 FIX: Auto-set initial focus when component mounts
  useEffect(() => {
    if (focusedLineIndex === -1 && activeLineIndex >= 0) {
      setFocusedLineIndex(activeLineIndex);
    }
  }, [activeLineIndex, focusedLineIndex]);

  // ✅ P1 FIX: Get current line text for screen readers
  const currentLineText = useMemo(() => {
    if (activeLineIndex >= 0 && activeLineIndex < lines.length) {
      return lines[activeLineIndex].words
        .map(w => w.word.replace(/[\n\r]/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
    }
    return '';
  }, [activeLineIndex, lines]);

  return (
    <div
      className={cn("h-full w-full bg-background/50 dark:bg-slate-950/80", className)}
      role="region"
      aria-label="Синхронизированный текст песни"
      onKeyDown={handleKeyDown}
      onTouchEnd={handleDoubleTap}
      tabIndex={0}
      ref={containerRef}
      {...bind()}
    >
      {/* ✅ P1 FIX: Screen reader announcement for current line */}
      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {currentLineText}
      </div>

      <ScrollArea className="h-full w-full">
        <div
          ref={scrollRef}
          className={cn(
            "flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 font-bold text-center min-h-full",
            fontSizeClasses
          )}
          aria-label="Текст песни"
          style={{ fontSize: `${fontSize}rem` }}
        >
          {lines.length === 0 ? (
            <div className="text-muted-foreground py-8">
              Текст не найден
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {lines.map((line, lineIndex) => {
                const isActive = lineIndex === activeLineIndex;
                const isFocused = lineIndex === focusedLineIndex;
                const lineText = line.words
                  .map(w => w.word.replace(/[\n\r]/g, ' ').trim())
                  .filter(Boolean)
                  .join(' ');

                return (
                  <motion.p
                    key={line.id}
                    data-line-index={lineIndex}
                    initial={{ opacity: 0.3, scale: 0.95, y: 10 }}
                    animate={{
                      opacity: isActive ? 1 : 0.4,
                      scale: isActive ? 1.05 : 0.95,
                      y: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    aria-live={isActive ? 'polite' : 'off'}
                    aria-atomic="true"
                    aria-relevant="text"
                    className={cn(
                      "mb-6 sm:mb-8 transition-all duration-300 leading-relaxed px-2 cursor-pointer",
                      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded-lg",
                      isActive
                        ? settings.highContrast
                          ? "text-blue-600 dark:text-cyan-400 font-extrabold"
                          : "text-foreground dark:text-foreground font-extrabold"
                        : settings.highContrast
                          ? "text-gray-700 dark:text-slate-300"
                          : "text-muted-foreground dark:text-muted-foreground/60",
                      isFocused && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => {
                      if (onSeek) {
                        onSeek(line.startTime);
                      }
                      setFocusedLineIndex(lineIndex);
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Строка ${lineIndex + 1}: ${lineText}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {line.words.map((word, wordIndex) => {
                      const cleanedWord = word.word.replace(/[\n\r]/g, ' ').trim();
                      if (!cleanedWord) return null;

                      // If word highlight is disabled, show plain text
                      if (settings.disableWordHighlight) {
                        return (
                          <span key={wordIndex} className="mr-2 sm:mr-3">
                            {cleanedWord}
                          </span>
                        );
                      }

                      const isWordActive = currentTime >= word.startS && currentTime <= word.endS;
                      const wordClass = cn(
                        "transition-all duration-150 px-1 cursor-pointer",
                        isWordActive && [
                          "text-white font-bold scale-110",
                          "drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]", // White glow
                          "relative z-10"
                        ],
                        !isWordActive && isActive && "text-gray-300 font-medium",
                        !isWordActive && !isActive && (
                          settings.highContrast
                          ? "text-gray-400"
                          : "text-muted-foreground"
                        )
                      );

                      return (
                        <motion.span
                          key={wordIndex}
                          className={wordClass}
                          onClick={() => onSeek?.(word.startS)}
                          initial={isWordActive ? { scale: 1 } : {}}
                          animate={isWordActive ? { scale: 1.1 } : { scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          {cleanedWord}{' '}
                        </motion.span>
                      );
                    })}
                  </motion.p>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TimestampedLyricsDisplay;
