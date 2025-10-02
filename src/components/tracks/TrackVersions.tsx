import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Star, Music2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

interface TrackVersion {
  id: string;
  version_number: number;
  is_master: boolean;
  suno_id: string;
  audio_url: string;
  video_url?: string;
  cover_url?: string;
  lyrics?: string;
  duration?: number;
  metadata?: any;
}

interface TrackVersionsProps {
  trackId: string;
  versions: TrackVersion[];
  onVersionUpdate?: () => void;
}

export const TrackVersions = ({ trackId, versions, onVersionUpdate }: TrackVersionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const handleSetMaster = async (versionId: string, versionNumber: number) => {
    try {
      // Unset all other masters
      await supabase
        .from('track_versions')
        .update({ is_master: false })
        .eq('parent_track_id', trackId);

      // Set new master
      const { error } = await supabase
        .from('track_versions')
        .update({ is_master: true })
        .eq('id', versionId);

      if (error) throw error;

      toast.success(`Версия ${versionNumber} установлена как мастер`);
      onVersionUpdate?.();
    } catch (error) {
      console.error('Error setting master version:', error);
      toast.error('Ошибка при установке мастер-версии');
    }
  };

  const handlePlayVersion = (version: TrackVersion) => {
    const trackKey = `${trackId}-v${version.version_number}`;
    const isCurrentVersion = currentTrack?.id === trackKey;

    if (isCurrentVersion && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: trackKey,
        title: `Версия ${version.version_number}`,
        audio_url: version.audio_url,
        cover_url: version.cover_url,
        duration: version.duration,
      });
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (versions.length <= 1) {
    return null;
  }

  const masterVersion = versions.find(v => v.is_master) || versions[0];
  const alternateVersions = versions.filter(v => !v.is_master);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Версии ({versions.length})
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {versions.map((version) => {
            const trackKey = `${trackId}-v${version.version_number}`;
            const isCurrentVersion = currentTrack?.id === trackKey;
            const isVersionPlaying = isCurrentVersion && isPlaying;

            return (
              <Card 
                key={version.id}
                className={`p-3 ${version.is_master ? 'ring-2 ring-primary' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant={isVersionPlaying ? "default" : "outline"}
                    onClick={() => handlePlayVersion(version)}
                  >
                    {isVersionPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Версия {version.version_number}
                      </span>
                      {version.is_master && (
                        <Badge variant="default" className="gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Мастер
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDuration(version.duration)}
                    </div>
                  </div>

                  {!version.is_master && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetMaster(version.id, version.version_number)}
                    >
                      <Star className="w-4 h-4 mr-1" />
                      Сделать мастером
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};