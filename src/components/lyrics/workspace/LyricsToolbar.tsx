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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Sparkles,
  Save
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSaveLyrics } from '@/hooks/useSaveLyrics';

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
  onSave?: (lyrics: string) => Promise<void>;
  currentLyrics?: string;
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
  onSave,
  currentLyrics = '',
  readOnly,
  compact
}) => {
  const { toast } = useToast();
  const { saveLyricsAsync, isSaving } = useSaveLyrics();
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [aiStyle, setAIStyle] = useState('');
  const [aiMood, setAIMood] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const errorCount = lintIssues.filter(i => i.severity === 'error').length;
  const warningCount = lintIssues.filter(i => i.severity === 'warning').length;

  const handleSave = async () => {
    if (!currentLyrics.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Введите текст лирики',
        variant: 'destructive'
      });
      return;
    }

    try {
      if (onSave) {
        await onSave(currentLyrics);
      } else {
        await saveLyricsAsync(currentLyrics);
      }
    } catch (error) {
      // Ошибки обрабатываются в hook/onSave
    }
  };

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
    <TooltipProvider>
      <div className={cn(
        "flex items-center gap-1 p-1.5 border-b bg-muted/30 w-full min-w-0 overflow-x-auto whitespace-nowrap scrollbar-minimal",
        compact && "p-1"
      )}>
        {/* View Mode Toggle */}
        {mode !== 'view' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'visual' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('visual')}
                  className="h-7 w-7 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Визуальный режим</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={viewMode === 'raw' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange('raw')}
                  className="h-7 w-7 p-0"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Исходный код</TooltipContent>
            </Tooltip>

            <Separator orientation="vertical" className="h-5" />
          </>
        )}

        {/* Actions */}
        {!readOnly && viewMode === 'visual' && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onAddSection}
                  className="h-7 w-7 p-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Добавить секцию (Ctrl+Enter)</TooltipContent>
            </Tooltip>

            {/* AI Generate Lyrics Button */}
            {onGenerateLyrics && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAIDialog(true)}
                    className="h-7 w-7 p-0"
                    disabled={isGenerating}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Сгенерировать текст с AI</TooltipContent>
              </Tooltip>
            )}

            {/* Save Button */}
            {stats.lines > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    className="h-7 w-7 p-0"
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Сохранить лирику</TooltipContent>
              </Tooltip>
            )}

            {showAITools && onGenerate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onGenerate}
                    className="h-7 w-7 p-0"
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI генерация</TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-1.5">
          <Badge 
            variant="secondary" 
            className="h-6 px-1.5 text-[10px] font-mono"
          >
            <FileText className="h-3 w-3 mr-1" />
            {stats.sections}
          </Badge>

          {!compact && (
            <span className="text-[10px] text-muted-foreground px-1">
              {stats.lines}L • {stats.words}W
            </span>
          )}

          {/* Lint Issues */}
          {(errorCount > 0 || warningCount > 0) && (
            <>
              <Separator orientation="vertical" className="h-4" />
              <Badge
                variant={errorCount > 0 ? 'destructive' : 'secondary'}
                className="h-6 px-1.5 text-[10px]"
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                {errorCount + warningCount}
              </Badge>
            </>
          )}
        </div>

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
    </TooltipProvider>
  );
};