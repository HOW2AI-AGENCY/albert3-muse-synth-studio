/**
 * Track Versions Component
 * Displays all versions of a track (main + variants)
 * Modernized with enhanced UI components and animations
 */

import { useTrackVariants } from '@/features/tracks/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { EnhancedBadge } from '@/components/ui/enhanced-badge';
import { CheckCircle, Music, Headphones } from 'lucide-react';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { formatTime } from '@/utils/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCallback } from 'react';

interface TrackVersionsProps {
  trackId: string;
  selectedVersionId?: string | null;
  onVersionSelect?: (versionId: string) => void;
}

export const TrackVersions = ({
  trackId,
  selectedVersionId,
  onVersionSelect,
}: TrackVersionsProps) => {
  const { data: variantsData, isLoading } = useTrackVariants(trackId);
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

  if (!variantsData || (variantsData.variants.length === 0 && !variantsData.mainTrack.audioUrl)) {
    return null;
  }

  // Combine main track and variants into a single list for rendering
  const allVersions = [
    { 
      ...variantsData.mainTrack, 
      isPreferredVariant: !variantsData.preferredVariant, 
      variantIndex: 0,
      title: variantsData.mainTrack.title,
    },
    ...variantsData.variants.map(v => ({
      ...v,
      title: variantsData.mainTrack.title,
    })),
  ].map((v, i) => ({
    ...v,
    id: v.id || `${trackId}-${i}`,
    audio_url: v.audioUrl,
    cover_url: v.coverUrl,
    isMasterVersion: v.isPreferredVariant,
    versionNumber: i + 1,
  }));

  const handleSelectVersion = useCallback((versionId: string) => {
    onVersionSelect?.(versionId);
  }, [onVersionSelect]);

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
          const isMain = index === 0;
          const isCurrentlyPlaying = currentTrack?.id === version.id && isPlaying;
          const isSelected = selectedVersionId === version.id;

          // A version is "active" if it's selected OR it's currently playing in the global player
          const isActive = isSelected || (currentTrack?.id === version.id);

          const displayNumber = index;

          return (
            <Card
              key={version.id}
              onClick={() => handleSelectVersion(version.id)}
              className={cn(
                "group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 interactive-element",
                "cursor-pointer border-border/60 hover:border-primary/30",
                isActive && "ring-2 ring-primary shadow-lg",
                "relative overflow-hidden"
              )}
            >
              {isMain && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
              )}
              
              <CardContent className="p-3 relative">
                <div className="flex items-center gap-3">
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
                    
                    {isCurrentlyPlaying && (
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
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={cn(
                        "text-sm font-medium truncate transition-colors duration-200",
                        isMain ? "text-foreground" : "text-foreground/90",
                        isActive && "text-primary font-semibold"
                      )}>
                        {version.title || 'Без названия'}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {version.duration && (
                        <span className="flex items-center gap-1">
                          <Music className="h-3 w-3" />
                          {formatTime(version.duration)}
                        </span>
                      )}
                      
                      {isCurrentlyPlaying && (
                        <EnhancedBadge variant="info" className="text-xs px-1.5 py-0">
                          Играет
                        </EnhancedBadge>
                      )}
                    </div>
                  </div>
                  
                  {/* The button now serves as a visual indicator, action is on the card */}
                  <div className="h-8 w-8 flex items-center justify-center">
                    {isSelected ? (
                       <CheckCircle className="h-5 w-5 text-primary" />
                    ) : (
                       <div className="h-5 w-5" /> // Placeholder for alignment
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
