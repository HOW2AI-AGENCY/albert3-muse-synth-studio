/**
 * Project Tracks Dialog
 * Shows tracks from selected project for reference selection
 */

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Search, Music2, Clock } from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { cn } from '@/lib/utils';

interface ProjectTracksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onTrackSelect: (trackId: string) => void;
  selectedTrackId?: string | null;
}

export const ProjectTracksDialog: React.FC<ProjectTracksDialogProps> = ({
  open,
  onOpenChange,
  projectId,
  projectName,
  onTrackSelect,
  selectedTrackId,
}) => {
  const { tracks: allTracks } = useTracks();
  const [searchQuery, setSearchQuery] = useState('');

  // Get tracks for selected project
  const projectTracks = useMemo(() => {
    return allTracks.filter(t => 
      t.project_id === projectId && 
      t.status === 'completed' &&
      t.audio_url
    );
  }, [allTracks, projectId]);

  // Filter tracks by search
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return projectTracks;
    const query = searchQuery.toLowerCase();
    return projectTracks.filter(t => 
      t.title.toLowerCase().includes(query) ||
      t.style_tags?.some(tag => tag.toLowerCase().includes(query)) ||
      t.genre?.toLowerCase().includes(query)
    );
  }, [projectTracks, searchQuery]);

  const handleTrackClick = (trackId: string) => {
    onTrackSelect(trackId);
    onOpenChange(false);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            Выбор трека из проекта
          </DialogTitle>
          <DialogDescription>
            Проект: <span className="font-medium text-foreground">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по названию, стилю, жанру..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tracks Grid */}
          <ScrollArea className="h-[400px] pr-4">
            {filteredTracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Music2 className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery 
                    ? 'Треки не найдены' 
                    : 'В проекте пока нет завершенных треков'}
                </p>
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => handleTrackClick(track.id)}
                    className={cn(
                      "group relative flex items-center gap-4 p-3 rounded-lg border-2 transition-all text-left w-full",
                      "hover:border-primary/50 hover:shadow-md hover:bg-accent/50",
                      selectedTrackId === track.id 
                        ? "border-primary bg-primary/5 shadow-lg" 
                        : "border-border bg-card"
                    )}
                  >
                    {/* Cover Image */}
                    <div className="relative flex-shrink-0">
                      {track.cover_url ? (
                        <img 
                          src={track.cover_url} 
                          alt={track.title}
                          className="w-16 h-16 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-md bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <Music2 className="h-6 w-6 text-primary/50" />
                        </div>
                      )}
                      {selectedTrackId === track.id && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4 className="font-semibold text-sm leading-tight truncate group-hover:text-primary transition-colors">
                        {track.title}
                      </h4>
                      
                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {track.style_tags && track.style_tags.slice(0, 3).map((tag, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {track.genre && (
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1.5 py-0 h-5"
                          >
                            {track.genre}
                          </Badge>
                        )}
                      </div>

                      {/* Duration & Provider */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(track.duration_seconds || track.duration || undefined)}
                        </span>
                        {track.provider && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                            {track.provider}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Play Icon Indicator */}
                    <div className={cn(
                      "flex-shrink-0 transition-opacity",
                      selectedTrackId === track.id ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                    )}>
                      <Music2 className="h-5 w-5 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {filteredTracks.length} {filteredTracks.length === 1 ? 'трек' : 'треков'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
