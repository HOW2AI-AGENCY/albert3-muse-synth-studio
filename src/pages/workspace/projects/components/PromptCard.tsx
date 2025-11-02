/**
 * 📝 Prompt Card Component
 * Карточка промпта с действиями
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Star, Copy, Edit2, Trash2, MoreVertical, Clock } from '@/utils/iconImports';
import { useUpdatePrompt, useDeletePrompt, useUsePrompt, type ProjectPrompt } from '@/hooks/useProjectPrompts';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { PromptDialog } from './PromptDialog';

interface PromptCardProps {
  prompt: ProjectPrompt;
}

const categoryColors: Record<string, string> = {
  music: 'bg-primary/10 text-primary',
  lyrics: 'bg-secondary/10 text-secondary',
  style: 'bg-accent/10 text-accent',
  concept: 'bg-muted/10 text-muted-foreground',
  general: 'bg-muted/10 text-muted-foreground',
};

export function PromptCard({ prompt }: PromptCardProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const updatePrompt = useUpdatePrompt();
  const deletePrompt = useDeletePrompt();
  const usePrompt = useUsePrompt();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.content);
    usePrompt.mutate(prompt.id);
    toast({
      title: 'Скопировано',
      description: 'Промпт скопирован в буфер обмена',
    });
  };

  const handleToggleFavorite = () => {
    updatePrompt.mutate({
      id: prompt.id,
      updates: { is_favorite: !prompt.is_favorite },
    });
  };

  const handleDelete = () => {
    if (confirm('Удалить этот промпт?')) {
      deletePrompt.mutate(prompt.id);
    }
  };

  return (
    <>
      <Card className="group hover:shadow-lg transition-all duration-200 hover:border-primary/50">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg line-clamp-1">{prompt.title}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {prompt.content}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleFavorite}
                className="h-8 w-8"
              >
                <Star
                  className={`h-4 w-4 ${
                    prompt.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''
                  }`}
                />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />
                    Копировать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Category */}
          {prompt.category && (
            <Badge variant="secondary" className={categoryColors[prompt.category] || ''}>
              {prompt.category}
            </Badge>
          )}

          {/* Tags */}
          {prompt.tags && prompt.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {prompt.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {prompt.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{prompt.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {prompt.last_used_at
              ? `Использован ${formatDistanceToNow(new Date(prompt.last_used_at), {
                  addSuffix: true,
                  locale: ru,
                })}`
              : 'Не использован'}
          </div>
          {prompt.usage_count !== undefined && (
            <span>{prompt.usage_count} использований</span>
          )}
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <PromptDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        projectId={prompt.project_id}
        prompt={prompt}
      />
    </>
  );
}
