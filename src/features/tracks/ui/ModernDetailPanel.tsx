/**
 * Modern Detail Panel with Tab Navigation
 * Clean, minimal design for track details
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, Download, Trash2, Sparkles } from 'lucide-react';
import { CompactTrackHero } from './CompactTrackHero';
import { OverviewContent } from './tabs/OverviewContent';
import { LyricsContent } from './tabs/LyricsContent';
import { AnalysisContent } from './tabs/AnalysisContent';
import { useTrackState } from '@/hooks/useTrackState';
import { useDownloadTrack } from '@/hooks/useDownloadTrack';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ModernDetailPanelProps {
  track: any; // Accept flexible track type
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onRemix?: (track: any) => void;
  defaultTab?: 'overview' | 'lyrics' | 'analysis';
}

export const ModernDetailPanel = ({
  track,
  onClose,
  onUpdate,
  onDelete,
  onRemix,
  defaultTab = 'overview',
}: ModernDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lyrics' | 'analysis'>(defaultTab);
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

  // Get lyrics from track or displayed version
  const hasLyrics = !!(track.lyrics || displayedVersion?.lyrics);

  const handleDownload = () => {
    if (displayedVersion?.audio_url) {
      window.open(displayedVersion.audio_url, '_blank');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleRemix = () => {
    // Auto-fill form with track data and switch to custom mode
    if (onRemix) {
      onRemix(track);
    } else {
      // Fallback: navigate to generate page with track data in localStorage
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
      toast({
        title: '🎵 Ремикс активирован',
        description: 'Форма заполнена данными трека',
      });
    }
  };

  const handleDeleteClick = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот трек и все связанные данные?')) {
      return;
    }

    setIsDeleting(true);
    try {
      await ApiService.deleteTrackCompletely(track.id);
      toast({
        title: '✅ Трек удален',
        description: 'Трек и все связанные данные успешно удалены',
      });
      onDelete?.();
      onClose?.();
    } catch (error) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось удалить трек',
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

  return (
    <div className="flex flex-col h-full">
      {/* Header with action buttons */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <h2 className="text-lg font-semibold">Детали трека</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRemix}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Ремикс
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadClick}
            disabled={isDownloading || !displayedVersion?.audio_url}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isDownloading ? 'Загрузка...' : 'Скачать'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Удаление...' : 'Удалить'}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      {/* Fixed Hero Section */}
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

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-12">
          <TabsTrigger value="overview" className="data-[state=active]:bg-muted">
            Обзор
          </TabsTrigger>
          <TabsTrigger value="lyrics" disabled={!hasLyrics} className="data-[state=active]:bg-muted">
            Текст
          </TabsTrigger>
          <TabsTrigger value="analysis" className="data-[state=active]:bg-muted">
            Анализ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex-1 mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50">
          <OverviewContent
            track={track}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        </TabsContent>

        <TabsContent value="lyrics" className="flex-1 mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50">
          <LyricsContent lyrics={track.lyrics || displayedVersion?.lyrics || ''} />
        </TabsContent>

        <TabsContent value="analysis" className="flex-1 mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50">
          <AnalysisContent track={track} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
