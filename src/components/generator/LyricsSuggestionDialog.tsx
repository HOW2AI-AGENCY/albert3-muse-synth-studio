/**
 * LyricsSuggestionDialog - предложение автоматической генерации лирики
 * Показывается когда пользователь выбрал трек без лирики
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, Music2 } from 'lucide-react';

interface LyricsSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackTitle: string;
  projectName?: string;
  genre?: string;
  mood?: string;
  onGenerate: () => void;
}

export const LyricsSuggestionDialog: React.FC<LyricsSuggestionDialogProps> = ({
  open,
  onOpenChange,
  trackTitle,
  projectName,
  genre,
  mood,
  onGenerate,
}) => {
  const handleGenerate = () => {
    onGenerate();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Лирика не найдена</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            Для трека <span className="font-semibold text-foreground">"{trackTitle}"</span> ещё нет лирики.
            Хотите создать её автоматически с помощью AI?
          </DialogDescription>
        </DialogHeader>

        {/* Контекст генерации */}
        <div className="space-y-3 py-2">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground font-medium">
              AI учтёт следующий контекст:
            </p>
            
            <div className="space-y-2">
              {projectName && (
                <div className="flex items-center gap-2 text-xs">
                  <Music2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Проект:</span>
                  <span className="font-medium">{projectName}</span>
                </div>
              )}
              
              {(genre || mood) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {genre && (
                    <Badge variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  )}
                  {mood && (
                    <Badge variant="secondary" className="text-xs">
                      {mood}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 После генерации вы сможете отредактировать текст вручную или попросить AI внести изменения
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Позже
          </Button>
          <Button
            onClick={handleGenerate}
            className="w-full sm:w-auto gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Сгенерировать лирику
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
