/**
 * Versions Card
 * Horizontal chips for track versions
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { supabase } from '@/integrations/supabase/client';

interface VersionData {
  id: string;
  parent_track_id: string;
  variant_index: number;
  is_primary_variant: boolean | null;
  is_preferred_variant: boolean | null;
  audio_url: string | null;
  cover_url: string | null;
  video_url: string | null;
  lyrics: string | null;
  duration: number | null;
  suno_id: string | null;
  metadata: any;
  created_at: string;
}

interface VersionsCardProps {
  versions: VersionData[];
  trackId: string;
}

export const VersionsCard = ({ versions, trackId }: VersionsCardProps) => {
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  
  const handleVersionClick = async (version: VersionData) => {
    // Fetch full track data and play
    const { data: track } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (track && version.audio_url) {
      playTrack({
        id: version.id,
        title: track.title,
        audio_url: version.audio_url,
        cover_url: version.cover_url || track.cover_url || undefined,
        duration: version.duration || undefined,
        parentTrackId: trackId,
        versionNumber: version.variant_index + 1,
      });
    }
  };
  
  const activeId = currentTrack?.id;
  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Версии ({versions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {versions.map((version) => (
            <Badge
              key={version.id}
              variant={version.id === activeId ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-all hover:scale-105 touch-target-min',
                version.id === activeId && 'bg-primary text-primary-foreground'
              )}
              onClick={() => handleVersionClick(version)}
            >
              Версия {version.variant_index + 1}
              {version.is_primary_variant && ' ⭐'}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
