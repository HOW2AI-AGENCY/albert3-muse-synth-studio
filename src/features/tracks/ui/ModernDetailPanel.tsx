/**
 * Modern Detail Panel with Tab Navigation - Desktop Version
 * Clean, minimal design with full-height layout and action buttons
 * 
 * @version 2.0.0
 * @audit-date 2025-11-17
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, Download, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { CompactTrackHero } from './CompactTrackHero';
import { OverviewContent } from './tabs/OverviewContent';
import { LyricsContent } from './tabs/LyricsContent';
import { AnalysisContent } from './tabs/AnalysisContent';
import { useTrackState } from '@/hooks/useTrackState';
import { useDownloadTrack } from '@/hooks/useDownloadTrack';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ModernDetailPanelProps {
  track: any;
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

  const hasLyrics = !!(track.lyrics || displayedVersion?.lyrics);
  const hasAudio = !!(displayedVersion?.audio_url || track.audio_url);

  const handleDownload = () => {
    if (displayedVersion?.audio_url) {
      window.open(displayedVersion.audio_url, '_blank');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: '✅ Ссылка скопирована',
        description: 'Ссылка на трек скопирована в буфер обмена',
      });
    } catch (error) {
      toast({
        title: '❌ Ошибка',
        description: 'Не удалось скопировать ссылку',
        variant: 'destructive',
      });
    }
  };

  const handleRemix = () => {
    if (onRemix) {
      onRemix(track);
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
      toast({
        title: '🎵 Ремикс активирован',
        description: 'Форма заполнена данными трека',
      });
    }
  };

  const handleDeleteClick = async () => {
    if (!confirm('Вы уверены, что хотите удалить этот трек и все связанные данные (версии, стемы)?')) {
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
        title: '❌ Ошибка удаления',
        description: 'Не удалось удалить трек. Попробуйте позже.',
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
    <div className="flex flex-col h-full bg-background">
      {/* Header with Actions - Fixed */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold truncate pr-4">Детали трека</h2>
          
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemix}
              className="gap-1.5 h-9"
              title="Создать ремикс на основе этого трека"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Ремикс</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadClick}
              disabled={isDownloading || !hasAudio}
              className="gap-1.5 h-9"
              title={hasAudio ? 'Скачать трек' : 'Нет доступного аудио'}
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isDownloading ? 'Загрузка...' : 'Скачать'}
              </span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="gap-1.5 h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Удалить трек навсегда"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </span>
            </Button>
            
            <Separator orientation="vertical" className="h-6 mx-1" />
            
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-9 w-9"
                title="Закрыть панель"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hero Section - Fixed */}
      <div className="flex-shrink-0">
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
      </div>

      {/* Tabs - Scrollable Content */}
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as typeof activeTab)} 
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Tab Navigation - Sticky */}
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-12 flex-shrink-0 sticky top-[57px] z-10 bg-background">
          <TabsTrigger 
            value="overview" 
            className={cn(
              "data-[state=active]:bg-muted relative",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:data-[state=active]:bg-primary after:transition-colors"
            )}
          >
            Обзор
          </TabsTrigger>
          <TabsTrigger 
            value="lyrics" 
            disabled={!hasLyrics} 
            className={cn(
              "data-[state=active]:bg-muted relative",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:data-[state=active]:bg-primary after:transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            title={hasLyrics ? 'Текст песни' : 'Текст отсутствует'}
          >
            Текст
          </TabsTrigger>
          <TabsTrigger 
            value="analysis" 
            className={cn(
              "data-[state=active]:bg-muted relative",
              "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
              "after:data-[state=active]:bg-primary after:transition-colors"
            )}
          >
            Анализ
          </TabsTrigger>
        </TabsList>

        {/* Tab Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent 
            value="overview" 
            className="h-full mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50"
          >
            <OverviewContent
              track={track}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          </TabsContent>

          <TabsContent 
            value="lyrics" 
            className="h-full mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50"
          >
            <LyricsContent 
              lyrics={track.lyrics || displayedVersion?.lyrics || ''} 
              sunoTaskId={track.suno_task_id}
              sunoId={track.suno_id}
            />
          </TabsContent>

          <TabsContent 
            value="analysis" 
            className="h-full mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-50"
          >
            <AnalysisContent track={track} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};
