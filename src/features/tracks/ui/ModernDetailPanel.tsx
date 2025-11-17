/**
 * Modern Detail Panel with Tab Navigation
 * Clean, minimal design for track details
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompactTrackHero } from './CompactTrackHero';
import { OverviewContent } from './tabs/OverviewContent';
import { LyricsContent } from './tabs/LyricsContent';
import { AnalysisContent } from './tabs/AnalysisContent';
import { useTrackState } from '@/hooks/useTrackState';

interface ModernDetailPanelProps {
  track: any; // Accept flexible track type
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  defaultTab?: 'overview' | 'lyrics' | 'analysis';
}

export const ModernDetailPanel = ({
  track,
  onUpdate,
  onDelete,
  defaultTab = 'overview',
}: ModernDetailPanelProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'lyrics' | 'analysis'>(defaultTab);

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

  return (
    <div className="flex flex-col h-full">
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
