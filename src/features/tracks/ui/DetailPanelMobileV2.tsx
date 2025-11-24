/**
 * @file DetailPanelMobileV2.tsx
 * @description A redesigned, streamlined, and more functional mobile detail panel.
 * @version 2.0.0
 */
import { memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDownloadTrack } from '@/hooks/useDownloadTrack';
import { useDeleteTrack } from '@/hooks/useDeleteTrack';
import { useToast } from '@/hooks/use-toast';
import { CompactTrackHero } from './CompactTrackHero';
import { OverviewContent } from './tabs/OverviewContent';
import { LyricsContent } from './tabs/LyricsContent';
import { VersionsStemsContent } from './tabs/VersionsStemsContent';
import { AnalysisContent } from './tabs/AnalysisContent';
import { UnifiedTrackActionsMenu } from '@/components/tracks/shared/TrackActionsMenu.unified';
import { useTrackLike } from '@/features/tracks/hooks/useTrackLike';
import { Track } from '@/types/track';

interface DetailPanelMobileV2Props {
  track: Track;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onRemix?: (track: any) => void;
}

const DetailPanelMobileV2Component = ({ track, open, onOpenChange, onDelete, onRemix }: DetailPanelMobileV2Props) => {
  const { toast } = useToast();
  const { downloadTrack } = useDownloadTrack();
  const { deleteTrack } = useDeleteTrack();
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);

  const handleDelete = useCallback(async () => {
    try {
      await deleteTrack(track.id);
      toast({ title: 'Трек успешно удален' });
      onOpenChange(false);
      onDelete?.();
    } catch (error) {
      toast({ title: 'Ошибка при удалении трека', variant: 'destructive' });
    }
  }, [deleteTrack, track.id, toast, onOpenChange, onDelete]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="-ml-2">
              <X className="h-5 w-5" />
            </Button>
            <SheetTitle className="truncate">{track.title}</SheetTitle>
            <Button variant="ghost" size="icon" onClick={handleDelete} aria-label="Delete track">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4">
            <h1 className="text-2xl font-bold mb-2">{track.title}</h1>
            <p className="text-muted-foreground mb-4">
              {track.style_tags?.join(', ') || 'AI Music'}
            </p>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="sticky top-0 z-10 grid w-full grid-cols-4 bg-background/95 backdrop-blur-sm">
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="lyrics">Текст</TabsTrigger>
              <TabsTrigger value="versions">Версии</TabsTrigger>
              <TabsTrigger value="analysis">Анализ</TabsTrigger>
            </TabsList>
            <div className="p-4">
              <TabsContent value="overview">
                <OverviewContent track={track as any} />
              </TabsContent>
              <TabsContent value="lyrics">
                <LyricsContent lyrics={track.lyrics || ''} trackId={track.id} sunoId={track.suno_id || ''} />
              </TabsContent>
              <TabsContent value="versions">
                <VersionsStemsContent track={track as any} />
              </TabsContent>
              <TabsContent value="analysis">
                <AnalysisContent track={track as any} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const DetailPanelMobileV2 = memo(DetailPanelMobileV2Component);
