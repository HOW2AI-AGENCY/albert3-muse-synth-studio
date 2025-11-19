
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDAWProjects } from '@/hooks/useDAWProjects';
import { ProjectBrowser } from './ProjectBrowser';
import type { DAWProject } from '@/types/daw-project.types';

interface ProjectMenuProps {
  currentProject: DAWProject | null;
  onSave: () => void;
  onSaveAs: () => void;
  onLoadProject: (project: DAWProject) => void;
  onNew: () => void;
}

export function ProjectMenu({
  currentProject,
  onSave,
  onSaveAs,
  onLoadProject,
  onNew,
}: ProjectMenuProps) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const { projects, isLoading, deleteProject } = useDAWProjects();

  const handleSelectProject = (project: DAWProject) => {
    onLoadProject(project);
    setIsBrowserOpen(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    // Ideally, add a confirmation dialog here
    await deleteProject(projectId);
  };

  return (
    <>
      <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
        <Button variant="outline" size="sm" onClick={onNew}>
          New
        </Button>
        <Button variant="outline" size="sm" onClick={() => setIsBrowserOpen(true)}>
          Open
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={!currentProject}>
          Save
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveAs}>
          Save As...
        </Button>
      </div>

      <ProjectBrowser
        open={isBrowserOpen}
        onOpenChange={setIsBrowserOpen}
        projects={projects}
        isLoading={isLoading}
        onSelect={handleSelectProject}
        onDelete={handleDeleteProject}
      />
    </>
  );
}
