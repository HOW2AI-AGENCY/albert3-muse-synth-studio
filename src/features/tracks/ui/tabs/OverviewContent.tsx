/**
 * Overview Tab Content
 * Main information: stats, genre/mood, prompts, technical details
 */

import { GenreMoodCard } from '../cards/GenreMoodCard';
import { TrackStatsCard } from '../cards/TrackStatsCard';
import { PromptCard } from '../cards/PromptCard';
import { TechnicalDetailsCard } from '../cards/TechnicalDetailsCard';
import type { Track } from '@/types/domain/track.types';

interface OverviewContentProps {
  track: Track;
}

export const OverviewContent = ({ track }: OverviewContentProps) => {
  return (
    <div className="space-y-4">
      {/* Statistics */}
      <TrackStatsCard
        playCount={track.play_count}
        likeCount={track.like_count}
        viewCount={track.view_count}
        downloadCount={track.download_count}
      />

      {/* Genre & Mood */}
      {(track.genre || track.mood || (track.style_tags && track.style_tags.length > 0)) && (
        <GenreMoodCard
          genre={track.genre}
          mood={track.mood}
          tags={track.style_tags || []}
        />
      )}

      {/* Generation Prompts */}
      <PromptCard
        prompt={track.prompt}
        improvedPrompt={track.improved_prompt}
      />

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
