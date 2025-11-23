/**
 * Overview Tab Content
 * Main information: stats, genre/mood, prompts, technical details, AI analysis
 */

import { GenreMoodCard } from '../cards/GenreMoodCard';
import { TrackStatsCard } from '../cards/TrackStatsCard';
import { PromptCard } from '../cards/PromptCard';
import { TechnicalDetailsCard } from '../cards/TechnicalDetailsCard';
import { AIAnalysisCard } from '../cards/AIAnalysisCard';
import type { Track } from '@/types/domain/track.types';

interface OverviewContentProps {
  track: Track;
}

export const OverviewContent = ({ track }: OverviewContentProps) => {
  return (
    <div className="space-y-4">
      {/* AI Analysis */}
      <AIAnalysisCard trackId={track.id} />

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
