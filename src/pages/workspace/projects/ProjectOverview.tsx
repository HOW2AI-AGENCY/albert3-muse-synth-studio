/**
 * Project Overview Component
 * Displays all user projects in a grid layout
 */

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, SortAsc, CalendarDays } from 'lucide-react';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { ProjectDetailsDialog } from '@/components/projects/ProjectDetailsDialog';
import { useProjects } from '@/contexts/project/useProjects';
import { TrackListSkeleton } from '@/components/skeletons';
import type { Database } from '@/integrations/supabase/types';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdaptiveGrid } from '@/components/layout/ResponsiveLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];

export const ProjectOverview: React.FC = () => {
  const { projects, isLoading, deleteProject } = useProjects();
  // @ts-expect-error - For future subscription features
   
  const { subscription, plan } = useSubscription();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<MusicProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<MusicProject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'album' | 'single' | 'ep' | 'compilation'>('all');
  const [status, setStatus] = useState<'all' | 'draft' | 'active' | 'archived'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'last7' | 'last30' | 'last90'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'relevance'>('updated');

  const filteredSortedProjects = useMemo(() => {
    if (!projects) return [];

    const now = Date.now();
    const rangeDays = dateRange === 'last7' ? 7 : dateRange === 'last30' ? 30 : dateRange === 'last90' ? 90 : 0;
    const minDate = rangeDays > 0 ? new Date(now - rangeDays * 24 * 60 * 60 * 1000) : null;

    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = projects.filter((p) => {
      const pStatus = (p as any).project_status ?? (p as any).status ?? 'draft';
      const pType = (p as any).project_type ?? 'album';
      const updatedAt = (p as any).updated_at ? new Date((p as any).updated_at) : null;

      const matchesQuery = normalizedQuery.length === 0
        || (p.name?.toLowerCase().includes(normalizedQuery))
        || (p.description?.toLowerCase().includes(normalizedQuery))
        || ((p.genre || '').toLowerCase().includes(normalizedQuery))
        || ((p.mood || '').toLowerCase().includes(normalizedQuery))
        || ((Array.isArray((p as any).style_tags) ? (p as any).style_tags.join(' ') : '').toLowerCase().includes(normalizedQuery));

      const matchesCategory = category === 'all' || pType === category;
      const matchesStatus = status === 'all' || pStatus === status;
      const matchesDate = !minDate || (updatedAt && updatedAt >= minDate);

      return matchesQuery && matchesCategory && matchesStatus && matchesDate;
    });

    const scored = filtered.map((p) => {
      const updatedAt = (p as any).updated_at ? new Date((p as any).updated_at).getTime() : 0;
      let relevance = 0;
      if (normalizedQuery) {
        const hay = `${p.name ?? ''} ${(p.description ?? '')} ${(p.genre ?? '')} ${(p.mood ?? '')} ${Array.isArray((p as any).style_tags) ? (p as any).style_tags.join(' ') : ''}`.toLowerCase();
        relevance = (hay.includes(normalizedQuery) ? 1 : 0) + (p.name?.toLowerCase().startsWith(normalizedQuery) ? 1 : 0);
      }
      return { p, updatedAt, relevance };
    });

    scored.sort((a, b) => {
      if (sortBy === 'name') return (a.p.name ?? '').localeCompare(b.p.name ?? '');
      if (sortBy === 'relevance') return b.relevance - a.relevance;
      return b.updatedAt - a.updatedAt;
    });

    return scored.map(s => s.p);
  }, [projects, searchQuery, category, status, dateRange, sortBy]);

  if (isLoading) {
    return <TrackListSkeleton count={6} />;
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Создайте первый проект</h2>
          <p className="text-muted-foreground">
            Проекты помогут организовать треки в альбомы, EP или компиляции. 
            Используйте AI для генерации концепции и треклиста.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Создать проект
          </Button>
        </div>

        <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и действия */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold">Проекты</h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'проект' : 'проектов'}
          </p>
        </div>
        <FeatureGate
          feature="pro_mode"
          customCheck={() => {
            if (!plan?.max_projects) return true; // No limit
            return (projects?.length || 0) < plan.max_projects;
          }}
          fallback={
            <Button disabled className="h-11 sm:h-10 px-4">
              <Plus className="h-4 w-4 mr-2" />
              Достигнут лимит проектов
            </Button>
          }
        >
          <Button onClick={() => setCreateDialogOpen(true)} className="h-11 sm:h-10 px-4">
            <Plus className="h-4 w-4 mr-2" />
            Новый проект
          </Button>
        </FeatureGate>
      </div>

      {/* Панель инструментов: поиск, фильтры, сортировка */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по названию, жанру, тегам"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchQuery && (
              <Badge variant="secondary" className="hidden sm:inline-flex">Запрос: {searchQuery}</Badge>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
              <SelectTrigger aria-label="Фильтр по типу">
                <Filter className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <SelectValue placeholder="Тип" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="album">Альбом</SelectItem>
                <SelectItem value="single">Сингл</SelectItem>
                <SelectItem value="ep">EP</SelectItem>
                <SelectItem value="compilation">Сборник</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger aria-label="Статус проекта">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
                <SelectItem value="active">Активный</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger aria-label="Период">
                <CalendarDays className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">За всё время</SelectItem>
                <SelectItem value="last7">За 7 дней</SelectItem>
                <SelectItem value="last30">За 30 дней</SelectItem>
                <SelectItem value="last90">За 90 дней</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger aria-label="Сортировка">
                <SortAsc className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">По обновлению</SelectItem>
                <SelectItem value="name">По алфавиту</SelectItem>
                <SelectItem value="relevance">По релевантности</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Сетка карточек: адаптивная, 1–4 колонки */}
      <AdaptiveGrid minItemWidth={280} gap="md" className="mt-2">
        {filteredSortedProjects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onOpenDetails={() => {
              setSelectedProject(project);
              setDetailsDialogOpen(true);
            }}
            onDelete={() => {
              setProjectToDelete(project);
              setDeleteDialogOpen(true);
            }}
          />
        ))}
      </AdaptiveGrid>

      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

      <ProjectDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        project={selectedProject}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы действительно хотите удалить проект "{projectToDelete?.name}"? Это действие нельзя отменить.
              Все треки, связанные с проектом, останутся, но потеряют связь с проектом.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (projectToDelete) {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
