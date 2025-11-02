/**
 * 📁 Projects Page - Mobile-First Workspace System
 * Управление музыкальными проектами
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Grid3X3, List, Search, Folder, Sparkles, SlidersHorizontal } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/layout/EmptyState';
import { useProjects } from '@/hooks/useProjects';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/utils/formatters';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

type ViewMode = 'grid' | 'list';
type SortBy = 'updated' | 'created' | 'name' | 'tracks';

export default function Projects() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { projects, isLoading } = useProjects();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('updated');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredProjects = projects?.filter(project => {
    const matchesSearch = !searchQuery || 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === 'all' || project.project_type === filterType;

    return matchesSearch && matchesType;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'tracks':
        return (b.total_tracks || 0) - (a.total_tracks || 0);
      case 'created':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'updated':
      default:
        return new Date(b.last_activity_at || b.updated_at).getTime() - 
               new Date(a.last_activity_at || a.updated_at).getTime();
    }
  });

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Проекты"
          description="Ваши музыкальные проекты и коллекции"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <PageHeader
          title="Проекты"
          description="Ваши музыкальные проекты и коллекции"
          icon={Folder}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => navigate('/workspace/projects/create')} className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Новый проект</span>
            <span className="sm:hidden">Создать</span>
          </Button>
          <Button variant="outline" onClick={() => navigate('/workspace/projects/create?ai=true')} className="gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Создать с AI</span>
            <span className="sm:hidden">AI</span>
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск проектов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">По активности</SelectItem>
            <SelectItem value="created">По дате создания</SelectItem>
            <SelectItem value="name">По названию</SelectItem>
            <SelectItem value="tracks">По кол-ву треков</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-32">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Тип" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="single">Сингл</SelectItem>
            <SelectItem value="ep">EP</SelectItem>
            <SelectItem value="album">Альбом</SelectItem>
            <SelectItem value="mixtape">Микстейп</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode - Desktop only */}
        {!isMobile && (
          <div className="flex gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="px-3"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="px-3"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Projects List */}
      {!filteredProjects || filteredProjects.length === 0 ? (
        <EmptyState
          title={searchQuery ? "Ничего не найдено" : "Нет проектов"}
          description={searchQuery ? "Попробуйте изменить поисковый запрос" : "Создайте свой первый музыкальный проект"}
          icon={<Folder className="w-12 h-12" />}
          action={
            <Button onClick={() => navigate('/workspace/projects/create')} className="gap-2">
              <Plus className="w-4 h-4" />
              Создать проект
            </Button>
          }
        />
      ) : (
        <div className={`mt-6 ${
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }`}>
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              viewMode={viewMode}
              onClick={() => navigate(`/workspace/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}

interface ProjectCardProps {
  project: any;
  viewMode: ViewMode;
  onClick: () => void;
}

function ProjectCard({ project, viewMode, onClick }: ProjectCardProps) {
  const isGrid = viewMode === 'grid';

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
      onClick={onClick}
    >
      {isGrid ? (
        <>
          {/* Grid Layout */}
          {project.cover_url && (
            <div className="aspect-square overflow-hidden rounded-t-lg">
              <img 
                src={project.cover_url} 
                alt={project.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          )}
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
              {project.created_with_ai && (
                <Badge variant="secondary" className="gap-1 flex-shrink-0">
                  <Sparkles className="w-3 h-3" />
                  AI
                </Badge>
              )}
            </div>
            {project.description && (
              <CardDescription className="line-clamp-2">{project.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Треков:</span>
              <Badge variant="outline">
                {project.completed_tracks || 0}/{project.total_tracks || 0}
              </Badge>
            </div>
            {project.total_duration > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Длительность:</span>
                <span className="font-medium">{formatDuration(project.total_duration)}</span>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Обновлено {formatDistanceToNow(new Date(project.last_activity_at || project.updated_at), { 
                addSuffix: true, 
                locale: ru 
              })}
            </div>
          </CardContent>
        </>
      ) : (
        <>
          {/* List Layout */}
          <div className="flex items-center gap-4 p-4">
            {project.cover_url && (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                <img src={project.cover_url} alt={project.name} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{project.name}</h3>
                {project.created_with_ai && (
                  <Badge variant="secondary" className="gap-1">
                    <Sparkles className="w-3 h-3" />
                  </Badge>
                )}
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>{project.completed_tracks || 0}/{project.total_tracks || 0} треков</span>
                {project.total_duration > 0 && (
                  <span>{formatDuration(project.total_duration)}</span>
                )}
                <span>{formatDistanceToNow(new Date(project.last_activity_at || project.updated_at), { 
                  addSuffix: true, 
                  locale: ru 
                })}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
