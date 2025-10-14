import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sparkles } from "@/utils/iconImports";

interface InspirationTag {
  label: string;
  icon: string;
  description: string;
}

const INSPIRATION_TAGS: InspirationTag[] = [
  { label: 'Synthwave', icon: '🌆', description: 'Ретро 80-х с синтезаторами' },
  { label: 'Dream Pop', icon: '☁️', description: 'Воздушная атмосфера' },
  { label: 'Lo-Fi Hip Hop', icon: '🎧', description: 'Расслабляющий бит' },
  { label: 'Indie Rock', icon: '🎸', description: 'Живая энергия' },
  { label: 'Ambient', icon: '🌌', description: 'Космическое звучание' },
  { label: 'Electronic', icon: '⚡', description: 'Танцевальная энергия' },
  { label: 'Jazz Fusion', icon: '🎺', description: 'Импровизация и свобода' },
  { label: 'Chillwave', icon: '🌊', description: 'Летняя ностальгия' },
  { label: 'Post Rock', icon: '🎻', description: 'Эмоциональные инструменталы' },
  { label: 'Vaporwave', icon: '💿', description: 'Ретрофутуризм' },
];

interface TagsCarouselProps {
  onTagClick: (tag: string) => void;
  disabled?: boolean;
}

export const TagsCarousel = ({ onTagClick, disabled = false }: TagsCarouselProps) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1 sm:gap-1.5 px-1">
        <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
        <span className="text-[9px] sm:text-[10px] font-medium text-muted-foreground">
          Вдохновение
        </span>
      </div>
      <ScrollArea className="w-full whitespace-nowrap rounded-md border border-border/40 bg-secondary/20 p-1 sm:p-1.5">
        <div className="flex gap-1 sm:gap-1.5">
          {INSPIRATION_TAGS.map((tag) => (
            <Button
              key={tag.label}
              variant="outline"
              size="sm"
              className="shrink-0 gap-1 sm:gap-1.5 h-8 sm:h-7 text-[11px] sm:text-xs font-normal hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
              onClick={() => onTagClick(tag.label)}
              disabled={disabled}
              title={tag.description}
            >
              <span className="text-xs sm:text-sm">{tag.icon}</span>
              <span>{tag.label}</span>
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
