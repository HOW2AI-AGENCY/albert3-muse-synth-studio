import { useState, memo, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ListMusic, Play, X, GripVertical, Star } from "@/utils/iconImports";
import { useAudioPlayerStore, useCurrentTrack } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useToast } from "@/hooks/use-toast";
import type { AudioPlayerTrack } from "@/types/track";

// Мемоизированный компонент элемента очереди
const QueueItem = memo(({ 
  track, 
  index, 
  isCurrentTrack, 
  onPlay, 
  onRemove,
  isRemoving 
}: {
  track: AudioPlayerTrack;
  index: number;
  isCurrentTrack: boolean;
  onPlay: (track: AudioPlayerTrack) => void;
  onRemove: (trackId: string) => void;
  isRemoving: boolean;
}) => {
  const isVersion = track.versionNumber !== undefined && track.versionNumber > 0;
  const isMaster = track.isMasterVersion;

  return (
    <div
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

      {/* Track Cover */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <ListMusic className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Track Info */}
      <div className="flex-1 min-w-0" onClick={() => onPlay(track)}>
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">
            {track.title}
          </p>
          {isVersion && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
              V{track.versionNumber}
            </Badge>
          )}
          {isMaster && (
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {track.style_tags?.[0] || 'AI Generated'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          onClick={() => onPlay(track)}
          disabled={isCurrentTrack}
        >
          <Play className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 sm:h-8 sm:w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:text-destructive"
          onClick={() => onRemove(track.id)}
          disabled={isRemoving}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

QueueItem.displayName = 'QueueItem';

export const PlayerQueue = memo(() => {
  // ✅ Zustand store with optimized selectors
  const currentTrack = useCurrentTrack();
  const queue = useAudioPlayerStore((state) => state.queue);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const removeFromQueue = useAudioPlayerStore((state) => state.removeFromQueue);
  
  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();
  const [removingTrackId, setRemovingTrackId] = useState<string | null>(null);

  const handlePlayTrack = useCallback((track: AudioPlayerTrack) => {
    vibrate('light');
    playTrack(track);
    
    toast({
      title: "Воспроизведение",
      description: `Играет: ${track.title}`,
      duration: 2000,
    });
  }, [vibrate, playTrack, toast]);

  const handleRemove = useCallback(async (trackId: string) => {
    setRemovingTrackId(trackId);
    vibrate('warning');
    
    try {
      const trackToRemove = queue.find(t => t.id === trackId);
      removeFromQueue(trackId);
      
      toast({
        title: "Удалено из очереди",
        description: `Трек "${trackToRemove?.title}" убран из очереди`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить трек из очереди",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setRemovingTrackId(null);
    }
  }, [queue, vibrate, removeFromQueue, toast]);

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
            {queue.map((track, index) => (
              <QueueItem
                key={track.id}
                track={track}
                index={index}
                isCurrentTrack={track.id === currentTrack?.id}
                onPlay={handlePlayTrack}
                onRemove={handleRemove}
                isRemoving={removingTrackId === track.id}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

PlayerQueue.displayName = 'PlayerQueue';
