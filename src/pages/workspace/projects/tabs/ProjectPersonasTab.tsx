/**
 * 👤 Project Personas Tab
 * Управление персонами проекта
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from '@/utils/iconImports';

interface ProjectPersonasTabProps {
  projectId: string;
}

export function ProjectPersonasTab({}: ProjectPersonasTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Персоны проекта</CardTitle>
            <CardDescription>
              Персоны, используемые в данном проекте
            </CardDescription>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить персону
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Управление персонами будет реализовано в следующих фазах
        </p>
      </CardContent>
    </Card>
  );
}
