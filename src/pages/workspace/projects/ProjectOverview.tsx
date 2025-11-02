/**
 * Project Overview Component
 * Displays all user projects in a grid layout
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { useProjects } from '@/contexts/ProjectContext';
import { TrackListSkeleton } from '@/components/skeletons';

export const ProjectOverview: React.FC = () => {
  const { projects, isLoading, deleteProject, setSelectedProject } = useProjects();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Проекты</h2>
          <p className="text-muted-foreground">
            {projects.length} {projects.length === 1 ? 'проект' : 'проектов'}
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Новый проект
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => setSelectedProject(project)}
            onDelete={() => {
              if (confirm(`Удалить проект "${project.name}"?`)) {
                deleteProject(project.id);
              }
            }}
          />
        ))}
      </div>

      <CreateProjectDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </div>
  );
};
