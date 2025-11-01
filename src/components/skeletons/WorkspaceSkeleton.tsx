/**
 * Workspace Skeleton Loader
 * Phase 1, Week 4: Loading States & Skeletons
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';

interface WorkspaceSkeletonProps {
  className?: string;
}

export const WorkspaceSkeleton = memo(({ className }: WorkspaceSkeletonProps) => {
  return (
    <div className={cn('min-h-screen bg-background animate-pulse', className)}>
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="h-8 bg-muted rounded w-32" />
            <div className="flex gap-3">
              <div className="h-10 w-10 bg-muted rounded-full" />
              <div className="h-10 w-24 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 w-24 bg-muted rounded-t" />
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Page Title */}
          <div className="space-y-2">
            <div className="h-10 bg-muted rounded w-1/4" />
            <div className="h-5 bg-muted rounded w-1/3" />
          </div>
          
          {/* Content Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-muted rounded-lg" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

WorkspaceSkeleton.displayName = 'WorkspaceSkeleton';
