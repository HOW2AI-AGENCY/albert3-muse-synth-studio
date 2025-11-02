/**
 * Project Drafts Selector
 * Button + Dialog for selecting draft tracks from a project
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, Search, Music2, AlertCircle } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface ProjectDraftsSelectorProps {
  projectId: string | null;
  projectName?: string;
  onDraftSelect: (trackId: string) => void;
  selectedDraftId?: string | null;
  disabled?: boolean;
}

export const ProjectDraftsSelector: React.FC<ProjectDraftsSelectorProps> = ({
  projectId,
  projectName,
  onDraftSelect,
  selectedDraftId,
  disabled = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { tracks: allTracks } = useTracks();
  const { vibrate } = useHapticFeedback();

  // Фильтруем черновики проекта (статус pending, processing)
  const projectDrafts = useMemo(() => {
    if (!projectId) return [];
    return allTracks.filter(t => 
      t.project_id === projectId && 
      (t.status === 'pending' || t.status === 'processing')
    );
  }, [allTracks, projectId]);

  // Поиск по черновикам
  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return projectDrafts;
    const query = searchQuery.toLowerCase();
    return projectDrafts.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.prompt?.toLowerCase().includes(query) ||
      t.style_tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [projectDrafts, searchQuery]);

  const selectedDraft = projectDrafts.find(d => d.id === selectedDraftId);

  const handleDraftClick = (trackId: string) => {
    vibrate('light');
    onDraftSelect(trackId);
    setDialogOpen(false);
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Ожидание', variant: 'secondary' as const },
      processing: { label: 'Обработка', variant: 'default' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant} className="text-[10px]">{config.label}</Badge>;
  };

  if (!projectId) return null;

  return (
    <>
      <Button
        variant={selectedDraftId ? "default" : "outline"}
        onClick={() => setDialogOpen(true)}
        className="w-full h-10 justify-start gap-2 text-sm"
        disabled={disabled}
      >
        <FileText className="h-4 w-4" />
        <div className="flex-1 text-left truncate">
          {selectedDraft ? (
            <span className="truncate">{selectedDraft.title}</span>
          ) : (
            <span>Черновики проекта {projectDrafts.length > 0 && `(${projectDrafts.length})`}</span>
          )}
        </div>
        {projectDrafts.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {projectDrafts.length}
          </Badge>
        )}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] md:max-w-2xl max-h-[75vh] md:max-h-[85vh] pb-safe">
          <DialogHeader className="px-3 md:px-6">
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Черновики проекта
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              Проект: <span className="font-medium text-foreground">{projectName || 'Неизвестный'}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 md:space-y-4 px-3 md:px-6">
            {/* Поиск */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск черновиков..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 text-base md:h-10 md:text-sm"
              />
            </div>

            {/* Список черновиков */}
            <ScrollArea className="h-[40vh] md:h-[450px] pr-2 md:pr-4">
              {filteredDrafts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="font-medium text-sm mb-1">
                    {searchQuery ? 'Черновики не найдены' : 'Нет черновиков'}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    {searchQuery 
                      ? 'Попробуйте изменить поисковый запрос' 
                      : 'В этом проекте пока нет треков в статусе черновика'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredDrafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => handleDraftClick(draft.id)}
                      className={cn(
                        "group relative flex flex-col gap-3 p-3 md:p-4 rounded-lg border-2 transition-all text-left w-full active:scale-[0.98]",
                        "hover:border-primary/50 hover:shadow-md hover:bg-accent/30",
                        selectedDraftId === draft.id 
                          ? "border-primary bg-primary/5 shadow-lg" 
                          : "border-border bg-card"
                      )}
                      style={{ touchAction: 'manipulation' }}
                    >
                      {/* Заголовок и статус */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm leading-tight mb-1 group-hover:text-primary transition-colors">
                            {draft.title}
                          </h4>
                          {draft.prompt && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {draft.prompt}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {getStatusBadge(draft.status)}
                        </div>
                      </div>

                      {/* Теги стиля */}
                      {draft.style_tags && draft.style_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {draft.style_tags.slice(0, 4).map((tag, idx) => (
                            <Badge 
                              key={idx} 
                              variant="secondary" 
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              {tag}
                            </Badge>
                          ))}
                          {draft.style_tags.length > 4 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                              +{draft.style_tags.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Метаданные */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
                        {draft.provider && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            {draft.provider}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <Music2 className="h-3 w-3" />
                          {new Date(draft.created_at).toLocaleDateString('ru-RU', { 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {/* Индикатор выбора */}
                      {selectedDraftId === draft.id && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                          <svg className="w-3.5 h-3.5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Футер */}
            <div className="flex items-center justify-between pt-3 md:pt-4 px-3 md:px-6 pb-3 md:pb-0 border-t">
              <p className="text-xs text-muted-foreground">
                {filteredDrafts.length} {filteredDrafts.length === 1 ? 'черновик' : 'черновиков'}
              </p>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-10 md:h-9">
                Закрыть
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
