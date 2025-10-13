import React from 'react';
import { Tag } from '@/types/lyrics';
import { Badge } from '@/components/ui/badge';
import { 
  X, Music, Mic, Volume2, Headphones, Disc, Zap, Heart,
  Sun, Moon, Cloud, Star, Sparkles, Flame, Droplet, Wind,
  type LucideIcon 
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  className?: string;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, className }) => {
  const iconMap: Record<string, LucideIcon> = {
    Music, Mic, Volume2, Headphones, Disc, Zap, Heart,
    Sun, Moon, Cloud, Star, Sparkles, Flame, Droplet, Wind
  };
  const IconComponent = tag.icon ? iconMap[tag.icon] : null;

  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors",
        tag.color,
        className
      )}
      title={tag.description}
    >
      {IconComponent && <IconComponent className="h-3 w-3" />}
      <span>{tag.value}</span>
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
          aria-label="Remove tag"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
};
