/**
 * Track Versions Component
 * Displays all versions of a track (main + variants)
 * Modernized with enhanced UI components and animations
 */

import { useTrackVersions } from '@/features/tracks/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { EnhancedBadge } from '@/components/ui/enhanced-badge';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Play, Pause, Music, Headphones } from 'lucide-react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { formatTime } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TrackVersionsProps {
  trackId: string;
}

export const TrackVersions = ({ trackId }: TrackVersionsProps) => {
  const { allVersions = [], isLoading } = useTrackVersions(trackId);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const pause = useAudioPlayerStore((state) => state.pause);
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const isPlaying = useAudioPlayerStore((state) => state.isPlaying);

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

  // ✅ FIX: Helper for consistent version number calculation
  const getDisplayVersionNumber = (index: number): number => {
    // Use array index for version numbering (0 -> V1, 1 -> V2, etc.)
    return index + 1;
  };

  const handlePlayVersion = (version: typeof allVersions[0]) => {
    if (!version.audio_url) return;

    const isCurrentTrack = currentTrack?.id === version.id;
    
    if (isCurrentTrack && isPlaying) {
      pause();
    } else {
      playTrack({
        id: version.id,
        title: version.title || 'Untitled',
        audio_url: version.audio_url,
        cover_url: version.cover_url || undefined,
        duration: version.duration || undefined,
        lyrics: version.lyrics || undefined,
        versionNumber: getDisplayVersionNumber(allVersions.indexOf(version)),
      });
    }
  };

  return (
    <div className="space-y-3" data-testid="track-versions-container">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold bg-gradient-to-r from-primary to-accent-pink bg-clip-text text-transparent">
            Версии трека
          </h3>
          <EnhancedBadge variant="secondary" className="text-xs">
            {allVersions.length}
          </EnhancedBadge>
        </div>
        
        {allVersions.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Headphones className="h-3 w-3" />
            <span>Выберите версию для прослушивания</span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {allVersions.map((version, index) => {
          const isMain = index === 0; // First version is considered main
          const isCurrentVersion = currentTrack?.id === version.id;
          const isVersionPlaying = isCurrentVersion && isPlaying;
          const displayNumber = getDisplayVersionNumber(index);

          return (
            <Card
              key={version.id}
              className={cn(
                "group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 interactive-element",
                "cursor-pointer border-border/60 hover:border-primary/30",
                isCurrentVersion && "ring-2 ring-primary shadow-lg",
                "relative overflow-hidden"
              )}
            >
              {/* Background gradient for main version */}
              {isMain && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              )}
              
              <CardContent className="p-3 relative">
                <div className="flex items-center gap-3">
                  {/* Version Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <EnhancedBadge
                      variant={isMain ? "success" : "secondary"}
                      className={cn(
                        "text-xs font-medium transition-all duration-300",
                        isMain && "shadow-sm"
                      )}
                    >
                      {isMain ? "Основная" : `V${displayNumber}`}
                    </EnhancedBadge>
                  </div>

                  {/* Cover with Enhanced Design */}
                  <div className="relative flex-shrink-0">
                    <div className={cn(
                      "w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br transition-all duration-300 group-hover:shadow-md",
                      isMain
                        ? "from-primary/30 to-accent-pink/20 shadow-sm"
                        : "from-secondary/20 to-secondary/5"
                    )}>
                      {version.cover_url ? (
                        <img
                          src={version.cover_url}
                          alt={version.title || 'Version cover'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted/50">
                          <Music className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    {/* Playing Animation */}
                    {isVersionPlaying && (
                      <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="w-1 bg-primary rounded-full animate-pulse"
                            style={{
                              height: `${Math.random() * 8 + 4}px`,
                              animationDelay: `${i * 0.1}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Enhanced Info Section */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        "text-sm font-medium truncate transition-colors duration-200",
                        isMain ? "text-foreground" : "text-foreground/90",
                        isCurrentVersion && "text-primary font-semibold"
                      )}>
                        {version.title || 'Без названия'}
                      </p>
                      
                      {/* Remove preferred variant indicator since property doesn't exist */}
                    </div>
                    
                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {version.duration && (
                        <span className="flex items-center gap-1">
                          <Music className="h-3 w-3" />
                          {formatTime(version.duration)}
                        </span>
                      )}
                      
                      {/* Playing Status */}
                      {isVersionPlaying && (
                        <EnhancedBadge variant="info" className="text-xs px-1.5 py-0">
                          Играет
                        </EnhancedBadge>
                      )}
                      
                      {/* Remove audio quality indicator since property doesn't exist */}
                    </div>
                  </div>
                  
                  {/* Enhanced Play Button */}
                  <EnhancedButton
                    size="icon-sm"
                    variant={isVersionPlaying ? "default" : "outline"}
                    onClick={() => handlePlayVersion(version)}
                    disabled={!version.audio_url}
                    className={cn(
                      "h-8 w-8 transition-all duration-300",
                      isVersionPlaying && "shadow-lg scale-110",
                      !version.audio_url && "opacity-50 cursor-not-allowed"
                    )}
                    title={isVersionPlaying ? "Пауза" : "Воспроизвести"}
                  >
                    {isVersionPlaying ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </EnhancedButton>
                </div>
                
                {/* Progress Bar removed due to missing currentTime property in AudioPlayerTrack */}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
