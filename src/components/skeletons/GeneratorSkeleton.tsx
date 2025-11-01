/**
 * Generator Skeleton Loader
 * Phase 1, Week 4: Loading States & Skeletons
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface GeneratorSkeletonProps {
  className?: string;
}

export const GeneratorSkeleton = memo(({ className }: GeneratorSkeletonProps) => {
  return (
    <div className={cn('space-y-6 animate-pulse', className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
      </div>
      
      {/* Prompt Input */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-24" />
        <div className="h-32 bg-muted rounded-lg" />
      </div>
      
      {/* Style Selection */}
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      </div>
      
      {/* Advanced Options */}
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-40" />
        <div className="space-y-2">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
      
      {/* Generate Button */}
      <div className="h-12 bg-muted rounded-lg w-full" />
    </div>
  );
});

GeneratorSkeleton.displayName = 'GeneratorSkeleton';
