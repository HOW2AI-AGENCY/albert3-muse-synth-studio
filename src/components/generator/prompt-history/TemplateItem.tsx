import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Trash2 } from '@/utils/iconImports';

interface TemplateItemData {
  id: string;
  prompt: string;
  style_tags?: string[];
  template_name?: string;
}

interface TemplateItemProps {
  item: TemplateItemData;
  onSelect: (item: TemplateItemData) => void;
  onDelete: (id: string) => void;
}

export const TemplateItem = React.memo(({
  item,
  onSelect,
  onDelete,
}: TemplateItemProps) => {
  return (
    <Card
      className="cursor-pointer hover:border-primary transition-all group border-amber-500/50"
      onClick={() => onSelect(item)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <p className="text-sm font-semibold">
                {item.template_name}
              </p>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {item.prompt}
            </p>
            <div className="flex flex-wrap gap-1">
              {item.style_tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
});

TemplateItem.displayName = 'TemplateItem';
