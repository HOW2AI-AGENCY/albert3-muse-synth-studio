/**
 * Section Selector Component
 * Visual selector for choosing a time range in a track
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SectionSelectorProps {
  duration: number;
  onSelectionChange: (start: number, end: number) => void;
  initialStart?: number;
  initialEnd?: number;
  className?: string;
}

export const SectionSelector: React.FC<SectionSelectorProps> = ({
  duration,
  onSelectionChange,
  initialStart = 0,
  initialEnd = 10,
  className,
}) => {
  const [startTime, setStartTime] = useState(initialStart);
  const [endTime, setEndTime] = useState(Math.min(initialEnd, duration));

  const handleStartChange = useCallback((value: string) => {
    const newStart = Math.max(0, Math.min(parseFloat(value) || 0, endTime - 5));
    setStartTime(newStart);
    onSelectionChange(newStart, endTime);
  }, [endTime, onSelectionChange]);

  const handleEndChange = useCallback((value: string) => {
    const newEnd = Math.max(startTime + 5, Math.min(parseFloat(value) || 0, duration));
    setEndTime(newEnd);
    onSelectionChange(startTime, newEnd);
  }, [startTime, duration, onSelectionChange]);

  const handleSliderChange = useCallback((values: number[]) => {
    const [newStart, newEnd] = values;
    
    // Ensure minimum 5 second gap
    if (newEnd - newStart < 5) {
      return;
    }
    
    setStartTime(newStart);
    setEndTime(newEnd);
    onSelectionChange(newStart, newEnd);
  }, [onSelectionChange]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Visual Timeline */}
      <div className="relative h-16 bg-muted rounded-lg overflow-hidden">
        {/* Full duration background */}
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          Full Track: 0s - {duration.toFixed(1)}s
        </div>
        
        {/* Selected section highlight */}
        <div
          className="absolute top-0 bottom-0 bg-primary/20 border-l-2 border-r-2 border-primary"
          style={{
            left: `${(startTime / duration) * 100}%`,
            width: `${((endTime - startTime) / duration) * 100}%`,
          }}
        >
          <div className="flex items-center justify-center h-full text-xs font-medium">
            {startTime.toFixed(1)}s - {endTime.toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Range Slider */}
      <div className="px-2">
        <Slider
          min={0}
          max={duration}
          step={0.1}
          value={[startTime, endTime]}
          onValueChange={handleSliderChange}
          className="w-full"
        />
      </div>

      {/* Manual Input */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Start (seconds)</label>
          <Input
            type="number"
            min={0}
            max={endTime - 5}
            step={0.1}
            value={startTime}
            onChange={(e) => handleStartChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">End (seconds)</label>
          <Input
            type="number"
            min={startTime + 5}
            max={duration}
            step={0.1}
            value={endTime}
            onChange={(e) => handleEndChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
};
