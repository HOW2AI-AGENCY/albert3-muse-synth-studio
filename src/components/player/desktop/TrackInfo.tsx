/**
 * Track information display for desktop player
 */
import { memo, useMemo } from 'react';
import { Music } from '@/utils/iconImports';
import { Badge } from '@/components/ui/badge';

interface Track {
  id: string;
  title: string;
  cover_url?: string | null;
  style_tags?: string[] | null;
  versionNumber?: number;
}

interface TrackInfoProps {
  track: Track;
  isPlaying: boolean;
  hasVersions: boolean;
  currentVersionIndex: number;
}

export const TrackInfo = memo(({ track, isPlaying, hasVersions, currentVersionIndex }: TrackInfoProps) => {
  const versionLabel = useMemo(() => {
    if (!hasVersions) return null;
    return `V${track.versionNumber ?? currentVersionIndex + 1}`;
  }, [hasVersions, track.versionNumber, currentVersionIndex]);

  return (
    <div className="flex items-center gap-4 min-w-0 flex-1 max-w-xs">
      <div className="relative group">
        <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex-shrink-0 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-105">
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-primary animate-pulse flex items-center justify-center">
              <Music className="h-6 w-6 text-white/80" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Playing indicator */}
          {isPlaying && (
            <div className="absolute bottom-2 right-2">
              <div className="flex items-center gap-0.5">
                <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-sm truncate text-foreground hover:text-primary transition-colors duration-200">
            {track.title}
          </h4>
          {versionLabel && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {versionLabel}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {track.style_tags && track.style_tags.length > 0 ? (
            <p className="text-xs text-muted-foreground/80 truncate">
              {track.style_tags.slice(0, 2).join(', ')}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/80">AI Generated</p>
          )}
        </div>
      </div>
    </div>
  );
});

TrackInfo.displayName = 'TrackInfo';
