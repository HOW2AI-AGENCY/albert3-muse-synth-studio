import React, { useState } from 'react';
import { EditorMode, LintIssue } from '@/types/lyrics';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Wand2,
  Plus,
  Eye,
  Edit2,
  FileText,
  AlertCircle,
  Download,
  MoreVertical,
  Sparkles
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LyricsToolbarProps {
  mode: 'view' | 'edit' | 'generate';
  viewMode: 'visual' | 'raw';
  onViewModeChange: (mode: 'visual' | 'raw') => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  stats: {
    lines: number;
    words: number;
    chars: number;
    sections: number;
  };
  lintIssues: LintIssue[];
  showAITools: boolean;
  onGenerate?: () => void;
  onGenerateLyrics?: (lyrics: string) => void;
  onAddSection: () => void;
  readOnly: boolean;
  compact: boolean;
}

export const LyricsToolbar: React.FC<LyricsToolbarProps> = ({
  mode,
  viewMode,
  onViewModeChange,
  stats,
  lintIssues,
  showAITools,
  onGenerate,
  onGenerateLyrics,
  onAddSection,
  readOnly,
  compact
}) => {
  const { toast } = useToast();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiStyle, setAIStyle] = useState('');
  const [aiMood, setAIMood] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const errorCount = lintIssues.filter(i => i.severity === 'error').length;
  const warningCount = lintIssues.filter(i => i.severity === 'warning').length;

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите описание для генерации текста",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-lyrics-ai', {
        body: {
          prompt: aiPrompt,
          style: aiStyle,
          mood: aiMood,
          language: 'English'
        }
      });

      if (error) {
        console.error('AI generation error:', error);
        toast({
          title: "Ошибка генерации",
          description: error.message || "Не удалось сгенерировать текст",
          variant: "destructive"
        });
        return;
      }

      if (data?.lyrics && onGenerateLyrics) {
        onGenerateLyrics(data.lyrics);
        setShowAIDialog(false);
        setAIPrompt('');
        setAIStyle('');
        setAIMood('');
        toast({
          title: "Готово!",
          description: "Текст успешно сгенерирован",
        });
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast({
        title: "Ошибка",
        description: "Произошла непредвиденная ошибка",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 border-b bg-muted/30",
      compact && "p-1.5"
    )}>
      {/* View Mode Toggle */}
      {mode !== 'view' && (
        <>
          <div className="flex items-center gap-1 bg-background rounded-md p-1">
            <Button
              variant={viewMode === 'visual' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('visual')}
              className={cn("h-7 px-2", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Eye className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span className="ml-1.5">Visual</span>}
            </Button>
            <Button
              variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('raw')}
              className={cn("h-7 px-2", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Edit2 className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span className="ml-1.5">Raw</span>}
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      {/* Actions */}
      {!readOnly && viewMode === 'visual' && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddSection}
            className={cn("h-7 gap-1.5", compact && "h-6 px-1.5 text-[10px]")}
          >
            <Plus className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
            {!compact && <span>Добавить секцию</span>}
          </Button>

          {/* AI Generate Lyrics Button */}
          {onGenerateLyrics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAIDialog(true)}
              className={cn("h-7 gap-1.5", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Sparkles className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span>AI Текст</span>}
            </Button>
          )}

          {showAITools && onGenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerate}
              className={cn("h-7 gap-1.5", compact && "h-6 px-1.5 text-[10px]")}
            >
              <Wand2 className={cn("h-3.5 w-3.5", compact && "h-3 w-3")} />
              {!compact && <span>AI Generate</span>}
            </Button>
          )}
        </>
      )}

      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-2">
        <Badge 
          variant="secondary" 
          className={cn(
            "h-6 px-2 text-[10px] font-mono",
            compact && "h-5 px-1.5 text-[9px]"
          )}
        >
          <FileText className={cn("h-3 w-3 mr-1", compact && "h-2.5 w-2.5")} />
          {stats.sections}
        </Badge>

        {!compact && (
          <>
            <span className="text-xs text-muted-foreground">
              {stats.lines} lines
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">
              {stats.words} words
            </span>
          </>
        )}

        {/* Lint Issues */}
        {(errorCount > 0 || warningCount > 0) && (
          <>
            <Separator orientation="vertical" className="h-4" />
            <Badge
              variant={errorCount > 0 ? 'destructive' : 'secondary'}
              className={cn(
                "h-6 px-2 text-[10px]",
                compact && "h-5 px-1.5 text-[9px]"
              )}
            >
              <AlertCircle className={cn("h-3 w-3 mr-1", compact && "h-2.5 w-2.5")} />
              {errorCount + warningCount}
            </Badge>
          </>
        )}
      </div>

      {/* More Actions */}
      {!compact && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Download className="mr-2 h-4 w-4" />
              Export
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* AI Generate Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Генерация текста с помощью AI
            </DialogTitle>
            <DialogDescription>
              Опишите, какой текст песни вы хотите создать
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ai-prompt">Тема или описание *</Label>
              <Textarea
                id="ai-prompt"
                placeholder="Например: грустная песня о потерянной любви..."
                value={aiPrompt}
                onChange={(e) => setAIPrompt(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ai-style">Стиль (опционально)</Label>
                <Input
                  id="ai-style"
                  placeholder="Поп, рок, хип-хоп..."
                  value={aiStyle}
                  onChange={(e) => setAIStyle(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-mood">Настроение (опционально)</Label>
                <Input
                  id="ai-mood"
                  placeholder="Веселое, грустное..."
                  value={aiMood}
                  onChange={(e) => setAIMood(e.target.value)}
                  disabled={isGenerating}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>AI создаст профессиональный текст с правильной структурой секций на английском языке</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAIDialog(false)}
              disabled={isGenerating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
            >
              {isGenerating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Сгенерировать
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
