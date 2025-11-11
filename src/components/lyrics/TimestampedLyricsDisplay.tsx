import React, { useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimestampedLyricsDisplayProps {
  lyricsData: TimestampedWord[];
  currentTime: number;
  className?: string;
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
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

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
      if (activeElement) {
        activeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [activeLineIndex]);

  return (
    <div className={cn("h-full w-full", className)}>
      <ScrollArea className="h-full">
        <div ref={scrollRef} className="flex flex-col items-center justify-center p-4 text-3xl font-bold text-center">
          <AnimatePresence>
            {lines.map((line, lineIndex) => {
              const isActive = lineIndex === activeLineIndex;
              return (
                <motion.p
                  key={line.id}
                  data-line-index={lineIndex}
                  initial={{ opacity: 0.5, scale: 0.9 }}
                  animate={{
                    opacity: isActive ? 1 : 0.6,
                    scale: isActive ? 1 : 0.9,
                  }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className={cn("mb-6 transition-colors duration-300", isActive ? "text-primary" : "text-muted-foreground")}
                >
                  {line.words.map((word, wordIndex) => {
                    const progress = isActive ? Math.max(0, Math.min(1, (currentTime - word.startS) / (word.endS - word.startS))) : 0;
                    const cleanedWord = word.word.replace(/[\n\r]/g, ' ').trim();
                    if (!cleanedWord) return null;
                    return (
                      <span key={wordIndex} className="relative inline-block mr-2">
                        <span
                          className="absolute top-0 left-0 h-full w-full overflow-hidden bg-gradient-to-r from-primary to-primary-focus bg-clip-text text-transparent"
                          style={{
                            width: `${progress * 100}%`,
                          }}
                        >
                          {cleanedWord}
                        </span>
                        <span>{cleanedWord}</span>
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
