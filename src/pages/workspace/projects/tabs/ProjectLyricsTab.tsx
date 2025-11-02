/**
 * 📝 Project Lyrics Tab
 * Управление текстами проекта
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from '@/utils/iconImports';

interface ProjectLyricsTabProps {
  projectId: string;
}

export function ProjectLyricsTab({}: ProjectLyricsTabProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Лирика проекта</CardTitle>
            <CardDescription>
              Сохраненные тексты для данного проекта
            </CardDescription>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Добавить текст
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Управление лирикой будет реализовано в следующих фазах
        </p>
      </CardContent>
    </Card>
  );
}
