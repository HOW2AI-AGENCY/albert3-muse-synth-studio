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
import { Music, MoreVertical, Edit, Trash2, Clock, Disc3 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type MusicProject = Database['public']['Tables']['music_projects']['Row'];

interface ProjectCardProps {
  project: MusicProject;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenDetails?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onClick,
  onEdit,
  onDelete,
  onOpenDetails,
}) => {
  const completionPercent = project.total_tracks && project.total_tracks > 0
    ? Math.round((project.completed_tracks || 0) / project.total_tracks * 100)
    : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCardClick = () => {
    if (onOpenDetails) {
      onOpenDetails();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Card className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden">
      {/* Cover Image */}
      <div
        onClick={handleCardClick}
        className="relative h-40 sm:h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden"
      >
        {project.cover_url ? (
          <img
            src={project.cover_url}
            alt={project.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-12 w-12 sm:h-16 sm:w-16 text-primary/30" />
          </div>
        )}

        {/* Overlay with project type badge */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <Badge variant="secondary" className="backdrop-blur-sm bg-background/80 text-xs sm:text-sm">
            {project.project_type || 'single'}
          </Badge>
        </div>
        
        {/* Actions Menu */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-8 sm:w-8 backdrop-blur-sm bg-background/80 hover:bg-background/90">
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
      </div>

      <CardHeader onClick={handleCardClick} className="pb-3 space-y-2 sm:space-y-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-base sm:text-lg line-clamp-2 leading-tight min-h-[2.5rem]">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-xs sm:text-sm text-muted-foreground/90 line-clamp-3 leading-relaxed min-h-[3rem]">
              {project.description}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          {project.total_tracks !== null && project.total_tracks !== undefined && project.total_tracks > 0 && (
            <div className="flex items-center gap-1.5">
              <Disc3 className="h-4 w-4" />
              <span>{project.total_tracks} {project.total_tracks === 1 ? 'трек' : 'треков'}</span>
            </div>
          )}
          {project.total_duration && project.total_duration > 0 && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(project.total_duration)}</span>
            </div>
          )}
        </div>

        {/* Style tags */}
        {project.style_tags && project.style_tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {project.style_tags.slice(0, 4).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {project.style_tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{project.style_tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {project.total_tracks && project.total_tracks > 0 && (
        <CardContent onClick={handleCardClick} className="pt-0 pb-4">
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
        </CardContent>
      )}

      {project.genre && (
        <CardFooter onClick={handleCardClick} className="pt-0 pb-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Жанр:</span>
            <Badge variant="secondary">{project.genre}</Badge>
          </div>
        </CardFooter>
      )}
    </Card>
  );
};
