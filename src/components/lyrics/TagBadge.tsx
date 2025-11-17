import React from 'react';
import { Tag } from '@/types/lyrics';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getTagInfo } from '@/data/tagTranslations';
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

  // Получаем русский перевод и описание
  const tagInfo = getTagInfo(tag.value);
  const displayValue = tagInfo.ru;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors cursor-help",
              tag.color,
              className
            )}
          >
            {IconComponent && <IconComponent className="h-3 w-3" />}
            <span>{displayValue}</span>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="ml-1 hover:bg-white/20 rounded-full p-0.5 transition-colors"
                aria-label="Удалить тег"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs text-xs"
          sideOffset={5}
        >
          <div className="space-y-1">
            <p className="font-semibold text-primary">{tagInfo.original}</p>
            {tagInfo.description && (
              <p className="text-muted-foreground">{tagInfo.description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
