/**
 * Analysis Tab Content
 * AI description, music analysis, recommendations, references
 */

import { AIDescriptionCard } from '../cards/AIDescriptionCard';
import { MusicAnalysisCard } from '../cards/MusicAnalysisCard';
import { PromptsCard } from '../cards/PromptsCard';
import { StyleRecommendationsPanel } from '@/components/workspace/StyleRecommendationsPanel';
import { ReferenceSourcesPanel } from '@/components/workspace/ReferenceSourcesPanel';
import type { Track } from '@/types/domain/track.types';

interface AnalysisContentProps {
  track: Track;
}

export const AnalysisContent = ({ track }: AnalysisContentProps) => {
  const metadata = track.metadata as any || {};
  
  return (
    <div className="space-y-4">
      {/* AI Description */}
      {metadata.ai_description && (
        <AIDescriptionCard description={String(metadata.ai_description)} />
      )}

      {/* Music Analysis */}
      {(metadata.tempo_bpm || metadata.key_signature || metadata.instruments) && (
        <MusicAnalysisCard
          tempoBpm={metadata.tempo_bpm as number | undefined}
          keySignature={metadata.key_signature as string | undefined}
          instruments={metadata.instruments as string[] | undefined}
          energyLevel={metadata.energy_level as number | undefined}
          danceability={metadata.danceability as number | undefined}
          valence={metadata.valence as number | undefined}
        />
      )}

      {/* Style Recommendations (AI) - Only show if there's mood or genre */}
      {(track.mood || track.genre) && (
        <StyleRecommendationsPanel
          mood={track.mood || undefined}
          genre={track.genre || undefined}
          currentTags={track.style_tags || []}
          className="bg-card"
        />
      )}

      {/* Reference Sources */}
      <ReferenceSourcesPanel
        metadata={metadata}
        trackId={track.id}
        className="bg-card"
      />

      {/* Prompts (Collapsible) */}
      <PromptsCard
        prompt={track.prompt}
        improvedPrompt={track.improved_prompt}
      />
    </div>
  );
};
