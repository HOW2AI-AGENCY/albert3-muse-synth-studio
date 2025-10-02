import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Star, Music2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

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
  const { vibrate } = useHapticFeedback();

  const handleSetMaster = async (versionId: string, versionNumber: number) => {
    try {
      vibrate('medium');
      
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

      vibrate('success');
      toast.success(`Версия ${versionNumber} установлена как главная`);
      onVersionUpdate?.();
    } catch (error) {
      console.error('Error setting master version:', error);
      vibrate('error');
      toast.error('Ошибка при установке главной версии');
    }
  };

  const handlePlayVersion = (version: TrackVersion) => {
    vibrate('light');
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

  if (!versions || versions.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2 animate-fade-in">
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
          onClick={() => {
            vibrate('light');
            setIsExpanded(!isExpanded);
          }}
          className="h-8"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {versions.map((version) => {
            const trackKey = `${trackId}-v${version.version_number}`;
            const isCurrentVersion = currentTrack?.id === trackKey;
            const isVersionPlaying = isCurrentVersion && isPlaying;

            return (
              <Card 
                key={version.id}
                className={`p-3 transition-all hover:bg-muted/50 ${
                  version.is_master ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant={isVersionPlaying ? "default" : "outline"}
                    onClick={() => handlePlayVersion(version)}
                    className="h-10 w-10 flex-shrink-0 transition-transform active:scale-95"
                  >
                    {isVersionPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        Версия {version.version_number}
                      </span>
                      {version.is_master && (
                        <Badge variant="default" className="gap-1 text-xs">
                          <Star className="w-3 h-3 fill-current" />
                          Главная
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(version.duration)}
                    </div>
                  </div>

                  {!version.is_master && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetMaster(version.id, version.version_number)}
                      className="text-xs h-8 transition-transform active:scale-95"
                    >
                      <Star className="w-3 h-3 mr-1" />
                      <span className="hidden sm:inline">Сделать главной</span>
                      <span className="sm:hidden">Главная</span>
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
