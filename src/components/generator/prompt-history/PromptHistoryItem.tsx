import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Star, Trash2, RotateCcw, GitCompare, MoreVertical, Music } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { PromptHistoryItem as PromptHistoryItemData } from '@/hooks/usePromptHistory';

interface PromptHistoryItemProps {
  item: PromptHistoryItemData;
  onSelect: (item: PromptHistoryItemData) => void;
  onDelete: (id: string) => void;
  onCompare?: (item: PromptHistoryItemData) => void;
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
  onCompare,
  savingTemplateId,
  onStartSaveTemplate,
  onCancelSaveTemplate,
  templateName,
  onTemplateNameChange,
  onSaveAsTemplate,
}: PromptHistoryItemProps) => {
  // Fetch linked track
  const { data: linkedTrack } = useQuery({
    queryKey: ['track', item.result_track_id],
    queryFn: async () => {
      if (!item.result_track_id) return null;
      const { data } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', item.result_track_id)
        .maybeSingle();
      return data;
    },
    enabled: !!item.result_track_id,
  });

  return (
    <Card
      className={cn(
        'hover:border-primary transition-all group',
        item.is_template && 'border-amber-500/50'
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(item)}>
            <p className="text-sm font-medium line-clamp-2 mb-1">
              {item.prompt}
            </p>
            <div className="flex flex-wrap gap-1 mb-2">
              {item.generation_status && (
                <Badge variant={item.generation_status === 'success' ? 'default' : item.generation_status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                  {item.generation_status === 'success' ? '✓ Успешно' : item.generation_status === 'failed' ? '✗ Ошибка' : '⏳ В процессе'}
                </Badge>
              )}
              {item.provider && (
                <Badge variant="outline" className="text-xs">
                  {item.provider}
                </Badge>
              )}
              {item.generation_time_ms && (
                <span className="text-xs text-muted-foreground">
                  {(item.generation_time_ms / 1000).toFixed(1)}s
                </span>
              )}
              {item.style_tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Linked Track Preview */}
            {linkedTrack && (
              <div className="mt-2 p-2 bg-muted/50 rounded-lg flex items-center gap-2">
                <Music className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium flex-1">{linkedTrack.title}</span>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>❤️ {linkedTrack.like_count || 0}</span>
                  <span>▶ {linkedTrack.play_count || 0}</span>
                </div>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelect(item)}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Использовать снова
              </DropdownMenuItem>
              {onCompare && (
                <DropdownMenuItem onClick={() => onCompare(item)}>
                  <GitCompare className="w-4 h-4 mr-2" />
                  Сравнить результаты
                </DropdownMenuItem>
              )}
              {!item.is_template && (
                <DropdownMenuItem onClick={() => onStartSaveTemplate(item.id)}>
                  <Star className="w-4 h-4 mr-2" />
                  Сохранить как шаблон
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
