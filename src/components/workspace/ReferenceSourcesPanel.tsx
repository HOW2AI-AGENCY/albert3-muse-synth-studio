/**
 * References & Sources Panel
 * Displays reference information used during track generation
 */

import { memo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  User,
  Music,
  FileAudio,
  Folder,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ReferenceSourcesPanelProps {
  metadata: Record<string, unknown> | null;
  trackId: string;
  className?: string;
}

export const ReferenceSourcesPanel = memo<ReferenceSourcesPanelProps>(({
  metadata,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const personaId = metadata?.persona_id as string | undefined;
  const referenceTrackId = metadata?.reference_track_id as string | undefined;
  const referenceAudioUrl = metadata?.reference_audio_url as string | undefined;
  const inspoProjectId = metadata?.inspo_project_id as string | undefined;
  const projectId = metadata?.project_id as string | undefined;

  // Fetch persona data
  const { data: persona } = useQuery({
    queryKey: ['persona', personaId],
    queryFn: async () => {
      if (!personaId) return null;
      const { data, error } = await supabase
        .from('suno_personas')
        .select('id, name, description, cover_image_url')
        .eq('id', personaId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!personaId,
  });

  // Fetch reference track data
  const { data: refTrack } = useQuery({
    queryKey: ['track', referenceTrackId],
    queryFn: async () => {
      if (!referenceTrackId) return null;
      const { data, error } = await supabase
        .from('tracks')
        .select('id, title, cover_url, audio_url')
        .eq('id', referenceTrackId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!referenceTrackId,
  });

  // Fetch inspiration project data
  const { data: inspoProject } = useQuery({
    queryKey: ['project', inspoProjectId],
    queryFn: async () => {
      if (!inspoProjectId) return null;
      const { data, error } = await supabase
        .from('music_projects')
        .select('id, name, genre, mood')
        .eq('id', inspoProjectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!inspoProjectId,
  });

  // Fetch active project data
  const { data: activeProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('music_projects')
        .select('id, name, genre, mood')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!projectId,
  });

  const hasReferences = !!(personaId || referenceTrackId || referenceAudioUrl || inspoProjectId || projectId);

  if (!hasReferences) return null;

  return (
    <Card className={cn("bg-muted/30 border-border/40 overflow-hidden", className)}>
      <CardHeader
        className="pb-2 px-3 sm:px-4 pt-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Референсы и источники
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-3 sm:px-4 pb-3 space-y-2">
          {/* Persona */}
          {persona && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 rounded-md bg-primary/5 border border-primary/20">
              {persona.cover_image_url ? (
                <img
                  src={persona.cover_image_url}
                  alt={persona.name}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                    Персона
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium truncate">{persona.name}</p>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">
                      {persona.description}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs">{persona.description}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={() => window.open(`/workspace/personas?id=${persona.id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          )}

          {/* Reference Track */}
          {refTrack && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 rounded-md bg-accent/30 border border-accent/40">
              {refTrack.cover_url ? (
                <img
                  src={refTrack.cover_url}
                  alt={refTrack.title}
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-md object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-accent/50 flex items-center justify-center flex-shrink-0">
                  <Music className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                    Референсный трек
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium truncate">{refTrack.title}</p>
                {refTrack.audio_url && (
                  <audio controls src={refTrack.audio_url} className="w-full h-6 mt-1" />
                )}
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={() => window.open(`/workspace/library?track=${refTrack.id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          )}

          {/* Reference Audio URL (uploaded/recorded) */}
          {referenceAudioUrl && !refTrack && (
            <div className="p-2 rounded-md bg-accent/30 border border-accent/40">
              <div className="flex items-center gap-2 mb-1.5">
                <FileAudio className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                  Референсное аудио
                </Badge>
              </div>
              <audio controls src={referenceAudioUrl} className="w-full h-6" />
            </div>
          )}

          {/* Inspiration Project */}
          {inspoProject && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 rounded-md bg-secondary/30 border border-secondary/40">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-secondary/50 flex items-center justify-center flex-shrink-0">
                <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                    Проект-вдохновение
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium truncate">{inspoProject.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {inspoProject.genre && (
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">{inspoProject.genre}</span>
                  )}
                  {inspoProject.genre && inspoProject.mood && (
                    <span className="text-[9px] text-muted-foreground">•</span>
                  )}
                  {inspoProject.mood && (
                    <span className="text-[9px] sm:text-[10px] text-muted-foreground">{inspoProject.mood}</span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={() => window.open(`/workspace/projects/${inspoProject.id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          )}

          {/* Active Project (if different from inspiration) */}
          {activeProject && activeProject.id !== inspoProjectId && (
            <div className="flex items-center gap-2 sm:gap-3 p-2 rounded-md bg-secondary/20 border border-secondary/30">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-md bg-secondary/40 flex items-center justify-center flex-shrink-0">
                <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                    Проект
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm font-medium truncate">{activeProject.name}</p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0"
                onClick={() => window.open(`/workspace/projects/${activeProject.id}`, '_blank')}
              >
                <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
});

ReferenceSourcesPanel.displayName = 'ReferenceSourcesPanel';
