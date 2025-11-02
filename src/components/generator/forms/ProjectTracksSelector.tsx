/**
 * Project Tracks Selector
 * Displays tracks from the active project for selection
 */

import { memo, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Play } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { cn } from '@/lib/utils';

interface ProjectTracksSelectorProps {
  projectId: string;
  projectName: string;
  onTrackSelect: (trackId: string) => void;
  selectedTrackId?: string | null;
  disabled?: boolean;
}

export const ProjectTracksSelector = memo(({
  projectId,
  projectName,
  onTrackSelect,
  selectedTrackId,
  disabled = false,
}: ProjectTracksSelectorProps) => {
  const { tracks: allTracks, isLoading } = useTracks();

  // Filter tracks for the selected project
  const projectTracks = useMemo(() => {
    return allTracks
      .filter((track) => track.project_id === projectId)
      .sort((a, b) => {
        // Sort by planned_order if exists, otherwise by created_at
        const orderA = (a.metadata as any)?.planned_order ?? 999;
        const orderB = (b.metadata as any)?.planned_order ?? 999;
        return orderA - orderB;
      });
  }, [allTracks, projectId]);

  if (isLoading) {
    return (
      <div className="px-2">
        <Card className="p-3">
          <div className="text-sm text-muted-foreground text-center">
            Загрузка треков...
          </div>
        </Card>
      </div>
    );
  }

  if (projectTracks.length === 0) {
    return (
      <div className="px-2">
        <Card className="p-3 border-dashed">
          <div className="flex flex-col items-center gap-2 text-center">
            <Music className="h-8 w-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">В проекте пока нет треков</p>
              <p className="text-xs text-muted-foreground mt-1">
                Создайте треки для проекта "{projectName}"
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground">
          Треки проекта "{projectName}"
        </h4>
        <Badge variant="secondary" className="text-[10px]">
          {projectTracks.length}
        </Badge>
      </div>

      <ScrollArea className="h-[200px]">
        <div className="space-y-2 pr-4">
          {projectTracks.map((track) => (
            <Card
              key={track.id}
              className={cn(
                "p-3 cursor-pointer transition-all hover:border-primary/50",
                selectedTrackId === track.id && "border-primary bg-primary/5",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onTrackSelect(track.id)}
            >
              <div className="flex items-center gap-3">
                {/* Cover Image */}
                <div className="relative flex-shrink-0">
                  {track.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Music className="h-6 w-6 text-primary/50" />
                    </div>
                  )}
                  {selectedTrackId === track.id && (
                    <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                      <Play className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate">{track.title}</p>
                    <Badge
                      variant={
                        track.status === 'completed' ? 'default' :
                        track.status === 'processing' ? 'outline' : 'secondary'
                      }
                      className="text-[10px] flex-shrink-0"
                    >
                      {track.status === 'completed' ? 'Готов' :
                       track.status === 'processing' ? 'Генерация' :
                       track.status === 'pending' ? 'В очереди' : 'Черновик'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {track.style_tags && track.style_tags.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {track.style_tags[0]}
                      </Badge>
                    )}
                    {track.duration && (
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedTrackId === track.id && (
                  <div className="flex-shrink-0">
                    <Badge variant="default" className="text-[10px]">
                      Выбран
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
});

ProjectTracksSelector.displayName = 'ProjectTracksSelector';
