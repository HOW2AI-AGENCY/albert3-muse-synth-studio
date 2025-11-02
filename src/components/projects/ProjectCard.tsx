/**
 * Project Card Component
 * Displays project overview with stats and actions
 */

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Music, MoreVertical, Edit, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];

interface ProjectCardProps {
  project: MusicProject;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onEdit,
  onDelete,
}) => {
  const completionPercent = project.total_tracks && project.total_tracks > 0
    ? Math.round((project.completed_tracks || 0) / project.total_tracks * 100)
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="group hover:border-primary/50 transition-all cursor-pointer">
      <CardHeader onClick={onClick} className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Music className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold truncate">{project.name}</h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {project.project_type || 'single'}
              </Badge>
              {project.total_tracks && project.total_tracks > 0 && (
                <span className="text-xs text-muted-foreground">
                  {project.total_tracks} треков
                </span>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {project.description}
          </p>
        )}
      </CardHeader>

      <CardContent onClick={onClick} className="pb-3">
        {project.total_tracks && project.total_tracks > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Прогресс</span>
              <span className="font-medium">{completionPercent}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {project.completed_tracks || 0}/{project.total_tracks} завершено
            </div>
          </div>
        )}

        {project.style_tags && project.style_tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-3">
            {project.style_tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.style_tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{project.style_tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter onClick={onClick} className="pt-0 flex items-center justify-between text-xs text-muted-foreground">
        {project.total_duration && project.total_duration > 0 ? (
          <span>⏱️ {formatDuration(project.total_duration)}</span>
        ) : (
          <span>Нет треков</span>
        )}
        
        {project.genre && (
          <span>🎼 {project.genre}</span>
        )}
      </CardFooter>
    </Card>
  );
};
