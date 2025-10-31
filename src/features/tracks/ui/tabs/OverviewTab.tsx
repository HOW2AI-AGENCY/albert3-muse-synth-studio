import { memo } from 'react';
import { DetailPanelContent } from '@/components/workspace/DetailPanelContent';

interface TrackVersion {
  id: string;
  variant_index: number;
  is_preferred_variant: boolean;
  is_primary_variant?: boolean;
  suno_id: string;
  audio_url: string;
  video_url?: string;
  cover_url?: string;
  lyrics?: string;
  duration?: number;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
  version_id?: string | null;
  created_at?: string;
}

interface OverviewTabProps {
  track: {
    id: string;
    title: string;
    prompt: string;
    status: string;
    audio_url?: string;
    cover_url?: string;
    video_url?: string;
    suno_id?: string;
    model_name?: string;
    lyrics?: string;
    style_tags?: string[];
    genre?: string;
    mood?: string;
    is_public?: boolean;
    view_count?: number;
    like_count?: number;
    created_at: string;
    duration_seconds?: number;
    has_stems?: boolean;
  };
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
