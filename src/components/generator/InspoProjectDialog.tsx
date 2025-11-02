import { memo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Search, Plus, Sparkles } from '@/utils/iconImports';
import { ProjectWizardDialog } from '@/components/projects/ProjectWizardDialog';
import { useMusicProjects } from '@/hooks/useMusicProjects';
import type { MusicProject } from '@/types/project.types';

export interface InspoProject {
  id: string;
  name: string; // Changed from title to name for projects
  style_tags: string[];
  genre?: string;
  mood?: string;
  cover_url?: string;
  concept_description?: string | null;
  persona_id?: string | null;
}

interface InspoProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProjectId?: string | null;
  onSelectProject?: (project: InspoProject) => void;
  onSelect?: (project: InspoProject) => void; // Alias for backward compatibility
}

export const InspoProjectDialog = memo(({
  open,
  onOpenChange,
  onSelect,
}: InspoProjectDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const { projects: musicProjects, isLoading: projectsLoading } = useMusicProjects();
  
  const handleSelect = onSelect;


  const handleProjectCreated = (project: MusicProject) => {
    if (handleSelect) {
      handleSelect({
        id: project.id,
        name: project.name,
        style_tags: project.style_tags || [],
        genre: project.genre || undefined,
        mood: project.mood || undefined,
        concept_description: project.concept_description,
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Проекты и Вдохновение</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="projects" className="flex-1">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="projects">Мои Проекты</TabsTrigger>
              <TabsTrigger value="create">Создать</TabsTrigger>
            </TabsList>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск проектов..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[400px]">
                {projectsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Загрузка проектов...</div>
                ) : musicProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="mb-2">Нет сохраненных проектов</p>
                    <p className="text-sm">Создайте первый проект во вкладке "Создать"</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {musicProjects
                      .filter(p => 
                        !searchQuery || 
                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        p.genre?.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((project) => (
                        <Card
                          key={project.id}
                          className="p-4 hover:bg-accent cursor-pointer transition-colors"
                          onClick={() => {
                            handleProjectCreated(project);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{project.name}</h4>
                              {project.description && (
                                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-2">
                                {project.genre && (
                                  <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                    {project.genre}
                                  </span>
                                )}
                                {project.mood && (
                                  <span className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded text-xs">
                                    {project.mood}
                                  </span>
                                )}
                                {project.style_tags?.slice(0, 3).map((tag, i) => (
                                  <span key={i} className="px-2 py-1 bg-muted rounded text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 py-4">
                <Card className="p-6 hover:bg-accent cursor-pointer transition-colors" onClick={() => setWizardOpen(true)}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-600 rounded-lg flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">AI Мастер</h3>
                      <p className="text-sm text-muted-foreground">
                        Создайте детальный проект с помощью AI: концепция, треклист, стиль
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 hover:bg-accent cursor-pointer transition-colors opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">Пустой проект</h3>
                      <p className="text-sm text-muted-foreground">
                        Создайте проект с нуля и заполните детали вручную
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">(скоро)</p>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Project Wizard */}
      <ProjectWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onProjectCreated={handleProjectCreated}
      />
    </>
  );
});

InspoProjectDialog.displayName = 'InspoProjectDialog';
