/**
 * Overview Tab Content
 * Stats, basic info, versions, stems
 */

import { StatsGrid } from '../cards/StatsGrid';
import { GenreMoodCard } from '../cards/GenreMoodCard';
import { VersionsCard } from '../cards/VersionsCard';
import { StemsCard } from '../cards/StemsCard';
import { TechnicalDetailsCard } from '../cards/TechnicalDetailsCard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Track } from '@/types/domain/track.types';

interface OverviewContentProps {
  track: Track;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const OverviewContent = ({
  track,
}: OverviewContentProps) => {
  // Fetch versions
  const { data: versionsData = [] } = useQuery({
    queryKey: ['track-versions', track.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('track_versions')
        .select('*')
        .eq('parent_track_id', track.id)
        .order('variant_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const versions = versionsData.map(v => ({
    ...v,
    metadata: v.metadata as Record<string, any> | null
  }));
  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <StatsGrid
        playCount={track.play_count || 0}
        likeCount={track.like_count || 0}
        downloadCount={track.download_count || 0}
        viewCount={track.view_count || 0}
      />

      {/* Genre & Mood */}
      {(track.genre || track.mood || (track.style_tags && track.style_tags.length > 0)) && (
        <GenreMoodCard
          genre={track.genre}
          mood={track.mood}
          tags={track.style_tags || []}
        />
      )}

      {/* Versions */}
      {versions.length > 0 && (
        <VersionsCard versions={versions} trackId={track.id} />
      )}

      {/* Stems Preview */}
      {track.has_stems && (
        <StemsCard trackId={track.id} />
      )}

      {/* Technical Details */}
      <TechnicalDetailsCard
        provider={track.provider || 'suno'}
        model={track.model_name}
        sunoId={track.suno_id}
        createdAt={track.created_at}
        duration={track.duration_seconds}
      />
    </div>
  );
};
