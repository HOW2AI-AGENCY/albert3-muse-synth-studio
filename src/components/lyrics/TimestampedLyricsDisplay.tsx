import React, { useMemo, useEffect, useRef, useState } from 'react';
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
  onTogglePlayPause?: () => void;
  onSeek?: (time: number) => void;
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
  onTogglePlayPause,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(1); // Used for pinch-to-zoom
  const [userSelectedLine, setUserSelectedLine] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevLine = Math.max(0, (userSelectedLine ?? activeLineIndex) - 1);
        onSeek?.(lines[prevLine].startTime);
        setUserSelectedLine(prevLine);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextLine = Math.min(lines.length - 1, (userSelectedLine ?? activeLineIndex) + 1);
        onSeek?.(lines[nextLine].startTime);
        setUserSelectedLine(nextLine);
      } else if (e.key === ' ') {
        e.preventDefault();
        onTogglePlayPause?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userSelectedLine, activeLineIndex, lines, onSeek, onTogglePlayPause]);

  const fontSizes = useMemo(() => ({ small: 1, medium: 1.5, large: 2 }), []);

  useEffect(() => {
    setFontSize(fontSizes[settings.fontSize]);
  }, [settings.fontSize, fontSizes]);

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
    
    // For ScrollArea, we need to get the viewport element
    const scrollContainer = scrollRef.current.closest('[data-radix-scroll-area-viewport]') as HTMLElement;

    if (activeElement && scrollContainer) {
      const containerHeight = scrollContainer.clientHeight;
      const elementTop = activeElement.offsetTop;
      const elementHeight = activeElement.clientHeight;
      
      // Center the active line
      const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
      const startScrollTop = scrollContainer.scrollTop;
      const distance = targetScrollTop - startScrollTop;

      // Skip animation if distance is very small
      if (Math.abs(distance) < 10) return;

      // Duration based on scroll speed setting (1 is slowest, 10 is fastest)
      const maxDuration = 1500;
      const minDuration = 200;
      const duration = maxDuration - ((settings.scrollSpeed - 1) / 9) * (maxDuration - minDuration);

      let startTime: number | null = null;

      const animateScroll = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;

        const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // Ease in-out quad
        const run = ease(Math.min(1, timeElapsed / duration));

        scrollContainer.scrollTop = startScrollTop + distance * run;

        if (timeElapsed < duration) {
          requestAnimationFrame(animateScroll);
        }
      };

      requestAnimationFrame(animateScroll);
    }
  }, [activeLineIndex, settings.scrollSpeed]);

  return (
    <div {...bind()} className={cn("h-full w-full bg-background/50 dark:bg-slate-950/80", className)} style={{ touchAction: 'none' }}>
      <ScrollArea className="h-full w-full">
        <div 
          ref={scrollRef} 
          className="flex flex-col items-center justify-start p-4 sm:p-6 md:p-8 font-bold text-center min-h-full"
          style={{ fontSize: `${fontSize}rem` }}
          role="log"
        >
          {lines.length === 0 ? (
            <div className="text-muted-foreground py-8">
              Текст не найден
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {lines.map((line, lineIndex) => {
                const isActive = lineIndex === activeLineIndex;
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
                      "mb-6 sm:mb-8 transition-all duration-300 leading-relaxed px-2",
                      isActive
                        ? settings.highContrast
                          ? "text-blue-600 dark:text-cyan-400 font-extrabold"
                          : "text-foreground dark:text-foreground font-extrabold"
                        : settings.highContrast
                          ? "text-gray-700 dark:text-slate-300"
                          : "text-muted-foreground dark:text-muted-foreground/60"
                    )}
                  >
                    {line.words.map((word, wordIndex) => {
                      const progress = isActive 
                        ? Math.max(0, Math.min(1, (currentTime - word.startS) / (word.endS - word.startS))) 
                        : 0;
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

                      return (
                        <span key={wordIndex} className="relative inline-block mr-2 sm:mr-3">
                          <span
                            className="absolute top-0 left-0 h-full overflow-hidden bg-gradient-to-r from-primary via-primary to-primary dark:from-cyan-400 dark:via-blue-500 dark:to-primary bg-clip-text text-transparent font-extrabold"
                            style={{
                              width: `${progress * 100}%`,
                            }}
                          >
                            {cleanedWord}
                          </span>
                          <span className="opacity-80">{cleanedWord}</span>
                        </span>
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
