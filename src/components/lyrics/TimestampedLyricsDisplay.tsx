import React, { useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';
import type { LyricsSettings } from './LyricsSettingsDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimestampedLyricsDisplayProps {
  lyricsData: TimestampedWord[];
  currentTime: number;
  className?: string;
  settings?: LyricsSettings;
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
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Font size classes based on settings
  const fontSizeClasses = useMemo(() => {
    const baseClasses = {
      small: 'text-base sm:text-lg md:text-xl lg:text-2xl',
      medium: 'text-lg sm:text-2xl md:text-3xl lg:text-4xl',
      large: 'text-xl sm:text-3xl md:text-4xl lg:text-5xl',
    };
    return baseClasses[settings.fontSize];
  }, [settings.fontSize]);

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
    if (activeLineIndex !== -1 && scrollRef.current) {
      const activeElement = scrollRef.current.querySelector<HTMLElement>(`[data-line-index="${activeLineIndex}"]`);
      const scrollContainer = scrollRef.current.parentElement; // Get the ScrollArea's viewport

      if (activeElement && scrollContainer) {
        const targetScrollTop = activeElement.offsetTop - (scrollContainer.clientHeight / 2) + (activeElement.clientHeight / 2);

        // Custom smooth scroll implementation
        const startScrollTop = scrollContainer.scrollTop;
        const distance = targetScrollTop - startScrollTop;

        // Duration based on scroll speed setting (1 is slowest, 10 is fastest)
        // We map the 1-10 range to a duration range, e.g., 1500ms to 200ms
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
    }
  }, [activeLineIndex, settings.scrollSpeed]);

  return (
    <div className={cn("h-full w-full bg-background/50 dark:bg-slate-950/80", className)}>
      <ScrollArea className="h-full w-full">
        <div ref={scrollRef} className={cn("flex flex-col items-center justify-center p-2 sm:p-4 font-bold text-center min-h-full", fontSizeClasses)}>
          <AnimatePresence>
            {lines.map((line, lineIndex) => {
              const isActive = lineIndex === activeLineIndex;
              return (
                <motion.p
                  key={line.id}
                  data-line-index={lineIndex}
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{
                    opacity: isActive ? 1 : 0.5,
                    scale: isActive ? 1.05 : 0.95,
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className={cn(
                    "mb-4 sm:mb-6 transition-all duration-300 leading-relaxed",
                    isActive
                      ? settings.highContrast
                        ? "text-blue-600 dark:text-cyan-400 font-extrabold"
                        : "text-primary dark:text-primary font-extrabold"
                      : settings.highContrast
                        ? "text-gray-700 dark:text-slate-300"
                        : "text-muted-foreground dark:text-slate-400"
                  )}
                >
                  {line.words.map((word, wordIndex) => {
                    const progress = isActive ? Math.max(0, Math.min(1, (currentTime - word.startS) / (word.endS - word.startS))) : 0;
                    const cleanedWord = word.word.replace(/[\n\r]/g, ' ').trim();
                    if (!cleanedWord) return null;

                    // If word highlight is disabled, show plain text
                    if (settings.disableWordHighlight) {
                      return (
                        <span key={wordIndex} className="mr-1 sm:mr-2">
                          {cleanedWord}
                        </span>
                      );
                    }

                    return (
                      <span key={wordIndex} className="relative inline-block mr-1 sm:mr-2">
                        <span
                          className="absolute top-0 left-0 h-full overflow-hidden bg-gradient-to-r from-primary via-primary-focus to-primary dark:from-cyan-400 dark:via-blue-400 dark:to-primary bg-clip-text text-transparent"
                          style={{
                            width: `${progress * 100}%`,
                          }}
                        >
                          {cleanedWord}
                        </span>
                        <span className="text-muted-foreground/80 dark:text-slate-500/90">{cleanedWord}</span>
                      </span>
                    );
                  })}
                </motion.p>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TimestampedLyricsDisplay;
