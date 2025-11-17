/**
 * Modern Mobile Detail Panel
 * Optimized for mobile devices with swipe gestures
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, Download, Trash2, Sparkles } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CompactTrackHero } from './CompactTrackHero';
import { OverviewContent } from './tabs/OverviewContent';
import { LyricsContent } from './tabs/LyricsContent';
import { VersionsStemsContent } from './tabs/VersionsStemsContent';
import { AnalysisContent } from './tabs/AnalysisContent';
import { useTrackState } from '@/hooks/useTrackState';
import { useDownloadTrack } from '@/hooks/useDownloadTrack';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface DetailPanelMobileV2Props {
  track: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: () => void;
  onRemix?: (track: any) => void;
}

export const DetailPanelMobileV2 = ({
  track,
  open,
  onOpenChange,
  onDelete,
  onRemix,
}: DetailPanelMobileV2Props) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lyrics' | 'versions' | 'analysis'>('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { downloadTrack, isDownloading } = useDownloadTrack();

  const {
    isLiked,
    handleLikeClick,
    displayedVersion,
  } = useTrackState({
    id: track.id,
    title: track.title,
    audio_url: track.audio_url,
    cover_url: track.cover_url,
    duration: track.duration_seconds,
    status: track.status as any,
    style_tags: track.style_tags || [],
    lyrics: track.lyrics,
    parentTrackId: track.id,
  } as any);

  const hasLyrics = !!(track.lyrics || displayedVersion?.lyrics);

  const handleRemix = () => {
    if (onRemix) {
      onRemix(track);
      onOpenChange(false);
    } else {
      localStorage.setItem('remixTrackData', JSON.stringify({
        title: track.title,
        prompt: track.prompt || track.improved_prompt,
        lyrics: track.lyrics,
        tags: track.style_tags?.join(', ') || '',
        genre: track.genre,
        mood: track.mood,
        trackId: track.id,
        timestamp: Date.now(),
      }));
      navigate('/workspace/generate');
      onOpenChange(false);
      toast({
        title: '🎵 Ремикс активирован',
        description: 'Форма заполнена данными трека',
      });
    }
  };

  const handleDeleteClick = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот трек?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await ApiService.deleteTrackCompletely(track.id);
      toast({
        title: '✅ Трек удален',
      });
      onDelete?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: '❌ Ошибка удаления',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadClick = () => {
    downloadTrack({
      id: track.id,
      title: track.title,
      audio_url: displayedVersion?.audio_url || track.audio_url,
    });
  };

  const handleDownload = () => {
    if (displayedVersion?.audio_url) {
      window.open(displayedVersion.audio_url, '_blank');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b space-y-0">
          <div className="flex items-center justify-between">
            <SheetTitle>Детали трека</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 pt-3 overflow-x-auto scrollbar-hide">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRemix}
              className="gap-2 whitespace-nowrap"
            >
              <Sparkles className="h-4 w-4" />
              Ремикс
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadClick}
              disabled={isDownloading}
              className="gap-2 whitespace-nowrap"
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Загрузка...' : 'Скачать'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="gap-2 whitespace-nowrap text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          <CompactTrackHero
            track={{
              title: track.title,
              cover_url: track.cover_url || undefined,
              status: track.status,
              created_at: track.created_at,
              duration_seconds: track.duration_seconds || undefined,
              style_tags: track.style_tags,
              play_count: track.play_count || 0,
              download_count: track.download_count || 0,
            }}
            activeVersion={displayedVersion && displayedVersion.audio_url ? {
              variant_index: 0,
              created_at: track.created_at,
              duration: displayedVersion.duration,
            } : undefined}
            isLiked={isLiked}
            likeCount={track.like_count || 0}
            onLike={handleLikeClick}
            onDownload={handleDownload}
            onShare={handleShare}
          />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-12 sticky top-0 z-10 bg-background">
              <TabsTrigger value="overview" className="data-[state=active]:bg-muted">
                Обзор
              </TabsTrigger>
              <TabsTrigger value="lyrics" disabled={!hasLyrics} className="data-[state=active]:bg-muted">
                Текст
              </TabsTrigger>
              <TabsTrigger value="versions" className="data-[state=active]:bg-muted">
                Версии
              </TabsTrigger>
              <TabsTrigger value="analysis" className="data-[state=active]:bg-muted">
                Анализ
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 mt-0 p-4">
              <OverviewContent track={track} />
            </TabsContent>

            <TabsContent value="lyrics" className="flex-1 mt-0 p-4">
              <LyricsContent 
                lyrics={track.lyrics || displayedVersion?.lyrics || ''} 
                sunoTaskId={track.suno_task_id}
                sunoId={track.suno_id}
              />
            </TabsContent>

            <TabsContent value="versions" className="flex-1 mt-0 p-4">
              <VersionsStemsContent track={track} />
            </TabsContent>

            <TabsContent value="analysis" className="flex-1 mt-0 p-4">
              <AnalysisContent track={track} />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
