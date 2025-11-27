import { memo } from 'react';
import { DetailPanelContent } from '@/components/workspace/DetailPanelContent';
import type { Track, TrackVersion, TrackStem } from '@/types/track.types';

interface OverviewTabProps {
  track: Track;
  title: string;
  setTitle: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  mood: string;
  setMood: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  isSaving: boolean;
  versions: TrackVersion[];
  stems: TrackStem[];
  onSave: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  loadVersionsAndStems: () => void;
}

export const OverviewTab = memo(({
  track,
  title,
  setTitle,
  genre,
  setGenre,
  mood,
  setMood,
  isPublic,
  setIsPublic,
  isSaving,
  versions,
  stems,
  onSave,
  onDownload,
  onShare,
  onDelete,
  loadVersionsAndStems,
}: OverviewTabProps) => {
  return (
    <div className="px-4 pb-6 space-y-3">
      <DetailPanelContent
        track={track}
        title={title}
        setTitle={setTitle}
        genre={genre}
        setGenre={setGenre}
        mood={mood}
        setMood={setMood}
        isPublic={isPublic}
        setIsPublic={setIsPublic}
        isSaving={isSaving}
        versions={versions}
        stems={stems}
        onSave={onSave}
        onDownload={onDownload}
        onShare={onShare}
        onDelete={onDelete}
        loadVersionsAndStems={loadVersionsAndStems}
        tabView="overview"
      />
    </div>
  );
});

OverviewTab.displayName = 'OverviewTab';
