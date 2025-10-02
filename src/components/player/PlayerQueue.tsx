import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ListMusic, Play, X, GripVertical, Star } from "lucide-react";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

export const PlayerQueue = () => {
  const { queue, currentTrack, currentQueueIndex, playTrack, removeFromQueue } = useAudioPlayer();
  const { vibrate } = useHapticFeedback();

  const handlePlayTrack = (track: typeof queue[0], index: number) => {
    vibrate('light');
    playTrack(track);
  };

  const handleRemove = (trackId: string) => {
    vibrate('warning');
    removeFromQueue(trackId);
  };

  if (queue.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ListMusic className="h-5 w-5" />
          {queue.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-96">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5" />
            Очередь ({queue.length})
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
          <div className="space-y-2">
            {queue.map((track, index) => {
              const isCurrentTrack = track.id === currentTrack?.id;
              const isPlaying = isCurrentTrack;
              const isVersion = track.versionNumber !== undefined && track.versionNumber > 0;
              const isMaster = track.isMasterVersion;

              return (
                <div
                  key={track.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    isCurrentTrack 
                      ? 'bg-primary/10 border border-primary/20' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {/* Drag Handle */}
                  <div className="opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Queue Number or Now Playing */}
                  <div className="w-6 text-center text-sm font-medium text-muted-foreground">
                    {isCurrentTrack ? (
                      <Play className="h-4 w-4 fill-primary text-primary animate-pulse" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>

                  {/* Cover */}
                  <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/20 to-accent/20">
                    {track.cover_url ? (
                      <img 
                        src={track.cover_url} 
                        alt={track.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ListMusic className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Track Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {track.title}
                      </h4>
                      {isVersion && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          V{track.versionNumber}
                        </Badge>
                      )}
                      {isMaster && (
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    {track.style_tags && track.style_tags.length > 0 && (
                      <p className="text-xs text-muted-foreground truncate">
                        {track.style_tags.slice(0, 2).join(', ')}
                      </p>
                    )}
                    {track.duration && (
                      <p className="text-xs text-muted-foreground">
                        {Math.floor(track.duration / 60)}:{String(track.duration % 60).padStart(2, '0')}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isCurrentTrack && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handlePlayTrack(track, index)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRemove(track.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
