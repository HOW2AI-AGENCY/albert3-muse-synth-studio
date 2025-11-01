/**
 * Create Project Dialog
 * Supports both manual and AI-assisted project creation
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, FileText } from 'lucide-react';
import { useAIProjectCreation } from '@/hooks/useAIProjectCreation';
import { useProjects } from '@/contexts/ProjectContext';
import type { Database } from '@/integrations/supabase/types';

type ProjectType = Database['public']['Enums']['project_type'];

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateProjectDialog: React.FC<CreateProjectDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { createProject } = useProjects();
  const { generateConcept, isGenerating, aiSuggestions, clearSuggestions } = useAIProjectCreation();

  // Manual mode state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('single');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // AI mode state
  const [aiPrompt, setAiPrompt] = useState('');

  const handleManualCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        project_type: projectType,
        genre: genre.trim() || undefined,
        mood: mood.trim() || undefined,
        user_id: '', // Will be set by context
      });

      // Reset form
      setName('');
      setDescription('');
      setProjectType('single');
      setGenre('');
      setMood('');
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;
    
    await generateConcept(aiPrompt);
  };

  const handleAICreate = async () => {
    if (!aiSuggestions) return;

    setIsCreating(true);
    try {
      await createProject({
        name: aiSuggestions.name,
        description: aiSuggestions.concept_description,
        project_type: 'album',
        genre: aiSuggestions.genre,
        mood: aiSuggestions.mood,
        style_tags: aiSuggestions.style_tags,
        concept_description: aiSuggestions.concept_description,
        story_theme: aiSuggestions.story_theme,
        tempo_range: JSON.parse(JSON.stringify(aiSuggestions.tempo_range)),
        planned_tracks: JSON.parse(JSON.stringify(aiSuggestions.planned_tracks)),
        user_id: '', // Will be set by context
      });

      // Reset
      setAiPrompt('');
      clearSuggestions();
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Создать проект</DialogTitle>
          <DialogDescription>
            Выберите способ создания: вручную или с помощью AI
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <FileText className="h-4 w-4 mr-2" />
              Вручную
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              С AI
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Название проекта *</Label>
              <Input
                id="name"
                placeholder="Мой новый альбом"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <Textarea
                id="description"
                placeholder="Краткое описание проекта..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Тип</Label>
                <Select value={projectType} onValueChange={(value) => setProjectType(value as ProjectType)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="ep">EP</SelectItem>
                    <SelectItem value="album">Album</SelectItem>
                    <SelectItem value="compilation">Compilation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="genre">Жанр</Label>
                <Input
                  id="genre"
                  placeholder="Electronic"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mood">Настроение</Label>
              <Input
                id="mood"
                placeholder="Energetic, Uplifting"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              />
            </div>

            <Button
              onClick={handleManualCreate}
              disabled={!name.trim() || isCreating}
              className="w-full"
            >
              {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Создать проект
            </Button>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-4">
            {!aiSuggestions ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Опишите ваш проект</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Создай synthwave альбом про неоновые ночи в городе, 10 треков, энергичное настроение..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={4}
                  />
                </div>

                <Button
                  onClick={handleAIGenerate}
                  disabled={!aiPrompt.trim() || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      AI генерирует концепцию...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Сгенерировать с AI
                    </>
                  )}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <h3 className="font-semibold text-lg">{aiSuggestions.name}</h3>
                  <p className="text-sm text-muted-foreground">{aiSuggestions.concept_description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Жанр:</span> {aiSuggestions.genre}
                    </div>
                    <div>
                      <span className="font-medium">Настроение:</span> {aiSuggestions.mood}
                    </div>
                  </div>

                  {aiSuggestions.planned_tracks && (
                    <div className="mt-3">
                      <p className="font-medium text-sm mb-2">Треклист ({aiSuggestions.planned_tracks.length}):</p>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {aiSuggestions.planned_tracks.map((track, idx) => (
                          <div key={idx} className="text-xs flex items-center justify-between p-2 bg-background rounded">
                            <span>{track.order}. {track.title}</span>
                            <span className="text-muted-foreground">{Math.floor(track.duration_target / 60)}:{(track.duration_target % 60).toString().padStart(2, '0')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearSuggestions();
                      setAiPrompt('');
                    }}
                    className="flex-1"
                  >
                    Заново
                  </Button>
                  <Button
                    onClick={handleAICreate}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Создать
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
