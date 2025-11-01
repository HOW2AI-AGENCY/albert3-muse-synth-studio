import React from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Trash2 } from '@/utils/iconImports';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PromptHistoryItemData {
  id: string;
  prompt: string;
  lyrics?: string;
  style_tags?: string[];
  genre?: string;
  mood?: string;
  is_template: boolean;
  template_name?: string;
  usage_count: number;
  last_used_at: string;
}

interface PromptHistoryItemProps {
  item: PromptHistoryItemData;
  onSelect: (item: PromptHistoryItemData) => void;
  onDelete: (id: string) => void;
  savingTemplateId: string | null;
  onStartSaveTemplate: (id: string) => void;
  onCancelSaveTemplate: () => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSaveAsTemplate: (id: string) => void;
}

export const PromptHistoryItem = React.memo(({
  item,
  onSelect,
  onDelete,
  savingTemplateId,
  onStartSaveTemplate,
  onCancelSaveTemplate,
  templateName,
  onTemplateNameChange,
  onSaveAsTemplate,
}: PromptHistoryItemProps) => {
  return (
    <Card
      className={cn(
        'cursor-pointer hover:border-primary transition-all group',
        item.is_template && 'border-amber-500/50'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium line-clamp-2 mb-1">
              {item.prompt}
            </p>
            <div className="flex flex-wrap gap-1">
              {item.style_tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {item.genre && (
                <Badge variant="outline" className="text-xs">
                  {item.genre}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!item.is_template && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartSaveTemplate(item.id);
                }}
              >
                <Star className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent
        className="pt-0 cursor-pointer"
        onClick={() => onSelect(item)}
      >
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {formatDistanceToNow(new Date(item.last_used_at), {
              addSuffix: true,
              locale: ru,
            })}
          </span>
          <span>Использован {item.usage_count}×</span>
        </div>
      </CardContent>

      {savingTemplateId === item.id && (
        <CardContent className="pt-0 pb-3">
          <div className="flex gap-2">
            <Input
              placeholder="Название шаблона"
              value={templateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              className="h-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onSaveAsTemplate(item.id);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => onSaveAsTemplate(item.id)}
              disabled={!templateName.trim()}
            >
              Сохранить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelSaveTemplate}
            >
              Отмена
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
});

PromptHistoryItem.displayName = 'PromptHistoryItem';
