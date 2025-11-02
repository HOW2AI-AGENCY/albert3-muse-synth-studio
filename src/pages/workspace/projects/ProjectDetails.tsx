/**
 * 📁 Project Details - Main Component with Tabs
 * Детальный view проекта с табами: Треки / Лирика / Промпты / Персоны
 */

import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import { Skeleton } from '@/components/ui/skeleton';
import { useProject } from '@/hooks/useProjects';
import { ProjectTracksTab } from './tabs/ProjectTracksTab';
import { ProjectLyricsTab } from './tabs/ProjectLyricsTab';
import { ProjectPromptsTab } from './tabs/ProjectPromptsTab';
import { ProjectPersonasTab } from './tabs/ProjectPersonasTab';

export default function ProjectDetails() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <PageContainer>
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96" />
      </PageContainer>
    );
  }

  if (!project) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Проект не найден</p>
          <Button onClick={() => navigate('/workspace/projects')} className="mt-4">
            Вернуться к проектам
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/workspace/projects')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tracks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tracks">Треки</TabsTrigger>
          <TabsTrigger value="lyrics">Лирика</TabsTrigger>
          <TabsTrigger value="prompts">Промпты</TabsTrigger>
          <TabsTrigger value="personas">Персоны</TabsTrigger>
        </TabsList>

        <TabsContent value="tracks" className="space-y-4">
          <ProjectTracksTab projectId={projectId!} />
        </TabsContent>

        <TabsContent value="lyrics" className="space-y-4">
          <ProjectLyricsTab projectId={projectId!} />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          <ProjectPromptsTab projectId={projectId!} />
        </TabsContent>

        <TabsContent value="personas" className="space-y-4">
          <ProjectPersonasTab projectId={projectId!} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
