/**
 * Timestamped Lyrics Display Component (Karaoke Mode)
 * Displays synchronized lyrics with word-level highlighting
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';

interface TimestampedLyricsDisplayProps {
  timestampedLyrics: TimestampedWord[];
  currentTime: number;
  onSeek: (time: number) => void;
  className?: string;
}

export const TimestampedLyricsDisplay = React.memo<TimestampedLyricsDisplayProps>(
  ({ timestampedLyrics, currentTime, onSeek, className }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeWordRef = useRef<HTMLSpanElement>(null);

    // Find current word index based on playback time
    const currentWordIndex = useMemo(() => {
      return timestampedLyrics.findIndex(
        (word) => currentTime >= word.startS && currentTime < word.endS
      );
    }, [timestampedLyrics, currentTime]);

    // Auto-scroll to current word
    useEffect(() => {
      if (activeWordRef.current && containerRef.current) {
        const container = containerRef.current;
        const activeWord = activeWordRef.current;
        
        const containerRect = container.getBoundingClientRect();
        const activeWordRect = activeWord.getBoundingClientRect();
        
        // Check if active word is out of view
        const isOutOfView = 
          activeWordRect.top < containerRect.top ||
          activeWordRect.bottom > containerRect.bottom;
        
        if (isOutOfView) {
          activeWord.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }
    }, [currentWordIndex]);

    const handleWordClick = (word: TimestampedWord) => {
      onSeek(word.startS);
    };

    return (
      <div
        ref={containerRef}
        className={cn(
          'h-full overflow-y-auto p-6 space-y-1',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border',
          className
        )}
      >
        <div className="text-center space-y-2">
          {timestampedLyrics.map((word, index) => {
            const isCurrent = index === currentWordIndex;
            const isPast = currentTime > word.endS;
            const isFuture = currentTime < word.startS;
            
            // Handle line breaks
            const isLineBreak = word.word.includes('[') || word.word.includes('\n');
            
            return (
              <React.Fragment key={index}>
                {isLineBreak && <br />}
                <span
                  ref={isCurrent ? activeWordRef : null}
                  onClick={() => handleWordClick(word)}
                  className={cn(
                    'inline-block px-1 py-0.5 cursor-pointer transition-all duration-200',
                    'hover:bg-accent/20 rounded',
                    {
                      'text-muted-foreground': isPast,
                      'text-primary font-bold scale-110 bg-primary/10': isCurrent,
                      'text-foreground': isFuture,
                    }
                  )}
                  style={{
                    transitionProperty: 'color, background-color, transform',
                  }}
                >
                  {word.word}
                </span>
                {' '}
              </React.Fragment>
            );
          })}
        </div>
        
        {timestampedLyrics.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>No timestamped lyrics available</p>
          </div>
        )}
      </div>
    );
  }
);

TimestampedLyricsDisplay.displayName = 'TimestampedLyricsDisplay';
