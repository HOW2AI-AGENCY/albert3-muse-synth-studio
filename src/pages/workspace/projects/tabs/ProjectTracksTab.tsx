/**
 * 🎵 Project Tracks Tab
 * Управление треками проекта
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from '@/utils/iconImports';
import { useProject } from '@/hooks/useProjects';

interface ProjectTracksTabProps {
  projectId: string;
}

export function ProjectTracksTab({ projectId }: ProjectTracksTabProps) {
  const { project } = useProject(projectId);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Треки проекта</CardTitle>
            <CardDescription>
              {project?.total_tracks || 0} треков, {project?.completed_tracks || 0} завершено
            </CardDescription>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить трек
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Управление треками будет реализовано в следующих фазах
        </p>
      </CardContent>
    </Card>
  );
}
