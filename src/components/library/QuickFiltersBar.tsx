/**
 * Quick Filters Bar Component
 * Phase 1.2: UX Improvements - Быстрая фильтрация треков
 */

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, Loader2, Heart, Mic, CheckCircle } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

export type QuickFilter = 'all' | 'completed' | 'processing' | 'liked' | 'vocals' | 'instrumental';

interface QuickFiltersBarProps {
  activeFilter: QuickFilter;
  onFilterChange: (filter: QuickFilter) => void;
  counts: {
    all: number;
    completed: number;
    processing: number;
    liked: number;
    vocals: number;
    instrumental: number;
  };
  className?: string;
}

interface FilterChipProps {
  label: string;
  icon: React.ReactNode;
  count: number;
  active: boolean;
  onClick: () => void;
}

const FilterChip = memo(({ label, icon, count, active, onClick }: FilterChipProps) => (
  <Button
    variant={active ? 'default' : 'outline'}
    size="sm"
    onClick={onClick}
    className={cn(
      'h-9 gap-2 transition-all duration-200',
      active && 'shadow-glow-primary',
      !active && 'hover:border-primary/50'
    )}
  >
    {icon}
    <span className="font-medium">{label}</span>
    <Badge 
      variant={active ? 'secondary' : 'outline'} 
      className={cn(
        'ml-1 min-w-[24px] justify-center',
        active && 'bg-primary-foreground/20 text-primary-foreground'
      )}
    >
      {count}
    </Badge>
  </Button>
));

FilterChip.displayName = 'FilterChip';

export const QuickFiltersBar = memo(({ 
  activeFilter, 
  onFilterChange, 
  counts,
  className 
}: QuickFiltersBarProps) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <FilterChip
        label="Все"
        icon={<Music className="w-4 h-4" />}
        count={counts.all}
        active={activeFilter === 'all'}
        onClick={() => onFilterChange('all')}
      />
      
      <FilterChip
        label="Готовые"
        icon={<CheckCircle className="w-4 h-4" />}
        count={counts.completed}
        active={activeFilter === 'completed'}
        onClick={() => onFilterChange('completed')}
      />
      
      <FilterChip
        label="В работе"
        icon={<Loader2 className="w-4 h-4 animate-spin" />}
        count={counts.processing}
        active={activeFilter === 'processing'}
        onClick={() => onFilterChange('processing')}
      />
      
      <FilterChip
        label="Избранное"
        icon={<Heart className="w-4 h-4" />}
        count={counts.liked}
        active={activeFilter === 'liked'}
        onClick={() => onFilterChange('liked')}
      />
      
      <FilterChip
        label="С вокалом"
        icon={<Mic className="w-4 h-4" />}
        count={counts.vocals}
        active={activeFilter === 'vocals'}
        onClick={() => onFilterChange('vocals')}
      />
      
      <FilterChip
        label="Инструментал"
        icon={<Music className="w-4 h-4" />}
        count={counts.instrumental}
        active={activeFilter === 'instrumental'}
        onClick={() => onFilterChange('instrumental')}
      />
    </div>
  );
});

QuickFiltersBar.displayName = 'QuickFiltersBar';
