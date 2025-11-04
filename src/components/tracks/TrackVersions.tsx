/**
 * Track Versions Component
 * Displays all versions of a track (main + variants)
 */

import { useTrackVersions } from '@/hooks/useTrackVersions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Music, Star } from 'lucide-react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { formatTime } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';

interface TrackVersionsProps {
  trackId: string;
}

export const TrackVersions = ({ trackId }: TrackVersionsProps) => {
  const { data: allVersions = [], isLoading } = useTrackVersions(trackId);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Версии</h3>
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (allVersions.length === 0) {
    return null;
  }

  const handlePlayVersion = (version: typeof allVersions[0]) => {
    if (!version.audio_url) return;

    playTrack({
      id: version.id,
      title: version.title || 'Untitled',
      audio_url: version.audio_url,
      cover_url: version.cover_url || undefined,
      duration: version.duration || undefined,
      lyrics: version.lyrics || undefined,
      versionNumber: version.variant_index || version.version_number || 0,
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Версии ({allVersions.length})</h3>
      </div>

      <div className="space-y-2">
        {allVersions.map((version) => {
          const isMain = version.is_primary_variant;
          const isPlaying = currentTrack?.id === version.id;

          return (
            <Card
              key={version.id}
              className={`transition-all duration-200 hover:shadow-md ${
                isPlaying ? 'ring-2 ring-primary' : ''
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Cover */}
                  <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0">
                    {version.cover_url ? (
                      <img
                        src={version.cover_url}
                        alt={version.title || 'Version cover'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {isMain ? 'Основная версия' : `Вариант ${version.variant_index || version.version_number || index}`}
                      </p>
                      {version.is_preferred_variant && (
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      )}
                      {isPlaying && (
                        <Badge variant="default" className="text-xs px-1 py-0 h-4">
                          Играет
                        </Badge>
                      )}
                    </div>
                    {version.duration && (
                      <p className="text-xs text-muted-foreground">
                        {formatTime(version.duration)}
                      </p>
                    )}
                  </div>
                  
                  {/* Play Button */}
                  <Button
                    size="icon"
                    variant={isPlaying ? "default" : "ghost"}
                    onClick={() => handlePlayVersion(version)}
                    disabled={!version.audio_url}
                    className="h-8 w-8"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
