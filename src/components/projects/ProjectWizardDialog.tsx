/**
 * Project Wizard Dialog
 * AI-assisted project creation with multi-step form
 */

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, RefreshCw, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import type { MusicProject, ProjectType } from '@/types/project.types';

interface ProjectWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectCreated?: (project: MusicProject) => void;
}

interface ProjectDraft {
  name: string;
  description: string;
  project_type: ProjectType;
  genre?: string;
  mood?: string;
  style_tags?: string[];
  concept_description?: string;
  story_theme?: string;
  planned_tracks?: Array<{ order: number; title: string; notes?: string }>;
}

export const ProjectWizardDialog = ({ open, onOpenChange, onProjectCreated }: ProjectWizardDialogProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<'input' | 'draft' | 'save'>('input');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Input step
  const [prompt, setPrompt] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('album');
  const [trackCount, setTrackCount] = useState(10);
  
  // Draft step
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  const handleGenerateDraft = useCallback(async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Введите описание',
        description: 'Опишите ваш музыкальный проект',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      logger.info('Generating project draft', 'ProjectWizard', { prompt, projectType, trackCount });
      
      const { data, error } = await SupabaseFunctions.invoke('ai-project-wizard', {
        body: {
          prompt,
          mode: 'draft',
          projectType,
          trackCount,
        },
      });

      if (error) {
        if (error.message?.includes('429')) {
          throw new Error('Слишком много запросов. Попробуйте через минуту.');
        }
        if (error.message?.includes('402')) {
          throw new Error('Необходимо пополнить кредиты в настройках.');
        }
        throw error;
      }

      const result = data as any;
      if (result?.draft) {
        setDraft(result.draft);
        setStep('draft');
        toast({
          title: '✨ Черновик готов!',
          description: 'Проверьте и отредактируйте детали',
        });
      }
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to generate draft', error, 'ProjectWizard');
      toast({
        title: 'Ошибка генерации',
        description: error.message || 'Не удалось создать черновик',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, projectType, trackCount, toast]);

  const handleSaveProject = useCallback(async () => {
    if (!draft) return;

    setIsSaving(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');

      const { data: project, error } = await supabase
        .from('music_projects')
        .insert({
          user_id: user.user.id,
          name: draft.name,
          description: draft.description,
          project_type: draft.project_type,
          genre: draft.genre,
          mood: draft.mood,
          style_tags: draft.style_tags,
          concept_description: draft.concept_description,
          story_theme: draft.story_theme,
          planned_tracks: draft.planned_tracks || [],
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: '🎉 Проект создан!',
        description: `"${draft.name}" добавлен в ваши проекты`,
      });

      onProjectCreated?.(project as MusicProject);
      onOpenChange(false);
      
      // Reset
      setStep('input');
      setPrompt('');
      setDraft(null);
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to save project', error, 'ProjectWizard');
      toast({
        title: 'Ошибка сохранения',
        description: error.message || 'Не удалось сохранить проект',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [draft, toast, onProjectCreated, onOpenChange]);

  const handleUseWithoutSaving = useCallback(() => {
    if (!draft) return;
    
    // Convert draft to MusicProject format for compatibility
    const tempProject: Partial<MusicProject> = {
      id: 'temp-' + Date.now(),
      name: draft.name,
      description: draft.description,
      project_type: draft.project_type,
      genre: draft.genre,
      mood: draft.mood,
      style_tags: draft.style_tags,
      concept_description: draft.concept_description,
      story_theme: draft.story_theme,
    };
    
    onProjectCreated?.(tempProject as MusicProject);
    onOpenChange(false);
    
    toast({
      title: 'Проект применён',
      description: 'Используем без сохранения',
    });
    
    // Reset
    setStep('input');
    setPrompt('');
    setDraft(null);
  }, [draft, onProjectCreated, onOpenChange, toast]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Sparkles className="w-5 h-5 inline mr-2" />
            AI Мастер Проектов
          </DialogTitle>
          <DialogDescription>
            Создайте детальный план музыкального проекта с помощью AI
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Опишите ваш проект</Label>
              <Textarea
                placeholder="Например: Концептуальный альбом о путешествии во времени, смесь synthwave и ambient..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Тип проекта</Label>
                <Select value={projectType} onValueChange={(v) => setProjectType(v as ProjectType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Сингл</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="album">Альбом</SelectItem>
                    <SelectItem value="soundtrack">Саундтрек</SelectItem>
                    <SelectItem value="instrumental">Инструментал</SelectItem>
                    <SelectItem value="custom">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Количество треков</Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={trackCount}
                  onChange={(e) => setTrackCount(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleGenerateDraft}
                disabled={isGenerating || !prompt.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Создать черновик
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Draft */}
        {step === 'draft' && draft && (
          <div className="space-y-4 pt-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Название проекта</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Textarea
                    value={draft.description}
                    onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Жанр</Label>
                    <Input
                      value={draft.genre || ''}
                      onChange={(e) => setDraft({ ...draft, genre: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Настроение</Label>
                    <Input
                      value={draft.mood || ''}
                      onChange={(e) => setDraft({ ...draft, mood: e.target.value })}
                    />
                  </div>
                </div>

                {draft.style_tags && draft.style_tags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Стилевые теги</Label>
                    <div className="flex flex-wrap gap-2">
                      {draft.style_tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {draft.planned_tracks && draft.planned_tracks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Треклист ({draft.planned_tracks.length})</Label>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {draft.planned_tracks.map((track, i) => (
                        <div key={i} className="text-sm p-2 bg-muted rounded">
                          {track.order}. {track.title}
                          {track.notes && <span className="text-muted-foreground ml-2">— {track.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('input');
                  setDraft(null);
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Заново
              </Button>
              
              <Button
                variant="outline"
                onClick={handleUseWithoutSaving}
                className="flex-1"
              >
                Использовать без сохранения
              </Button>
              
              <Button
                onClick={handleSaveProject}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Сохранить проект
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
