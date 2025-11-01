import { memo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Search, Music } from '@/utils/iconImports';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';

export interface InspoProject {
  id: string;
  title: string;
  style_tags: string[];
  genre?: string;
  mood?: string;
  cover_url?: string;
  prompt?: string;
}

interface InspoProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProjectId: string | null;
  onSelectProject: (project: InspoProject) => void;
}

export const InspoProjectDialog = memo(({
  open,
  onOpenChange,
  selectedProjectId,
  onSelectProject,
}: InspoProjectDialogProps) => {
  const [projects, setProjects] = useState<InspoProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<InspoProject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProjects();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = projects.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.style_tags?.some(tag => tag.toLowerCase().includes(query)) ||
        p.genre?.toLowerCase().includes(query) ||
        p.mood?.toLowerCase().includes(query)
      );
      setFilteredProjects(filtered);
    } else {
      setFilteredProjects(projects);
    }
  }, [searchQuery, projects]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, style_tags, genre, mood, cover_url, prompt')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setProjects(data as InspoProject[]);
      setFilteredProjects(data as InspoProject[]);
      
      logger.info('Loaded inspiration projects', 'InspoProjectDialog', { count: data.length });
    } catch (error) {
      logger.error('Failed to load projects', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Выбрать проект для вдохновения</DialogTitle>
          <DialogDescription>
            Выберите трек, чтобы использовать его стиль и настроение
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, стилю, жанру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Projects List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Ничего не найдено' : 'У вас пока нет завершенных треков'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 pb-4">
              {filteredProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onSelectProject(project)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-accent/5 transition-all text-left",
                    selectedProjectId === project.id && "border-primary bg-primary/5"
                  )}
                >
                  {/* Cover */}
                  <div className="flex-shrink-0 w-12 h-12 rounded bg-muted/50 overflow-hidden">
                    {project.cover_url ? (
                      <img
                        src={project.cover_url}
                        alt={project.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{project.title}</h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {project.style_tags?.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary"
                        >
                          {tag}
                        </span>
                      ))}
                      {project.style_tags && project.style_tags.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{project.style_tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

InspoProjectDialog.displayName = 'InspoProjectDialog';
