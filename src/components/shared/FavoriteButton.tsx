/**
 * Shared Favorite Button Component
 * Sprint 31 - Week 2: Code Quality & Refactoring
 * Task 2.1: Extract shared components
 */

import React from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onClick: (e: React.MouseEvent) => void;
  variant?: 'ghost' | 'outline' | 'default';
  className?: string;
}

export const FavoriteButton = React.memo<FavoriteButtonProps>(({ 
  isFavorite, 
  onClick,
  variant = 'ghost',
  className
}) => {
  return (
    <Button
      variant={variant}
      size="icon"
      className={cn('h-8 w-8', className)}
      onClick={onClick}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-colors',
          isFavorite && 'fill-yellow-400 text-yellow-400'
        )}
      />
    </Button>
  );
});

FavoriteButton.displayName = 'FavoriteButton';
