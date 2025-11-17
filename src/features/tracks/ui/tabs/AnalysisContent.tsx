/**
 * Analysis Tab Content
 * AI description, music analysis, recommendations, references
 */

import { ScrollArea } from '@/components/ui/scroll-area';
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
  return (
    <ScrollArea className="h-[calc(100vh-320px)]">
      <div className="space-y-4 p-4">
        {/* AI Description */}
        {track.metadata?.ai_description && (
          <AIDescriptionCard description={track.metadata.ai_description as string} />
        )}

        {/* Music Analysis */}
        {(track.metadata?.tempo_bpm || track.metadata?.key_signature || track.metadata?.instruments) && (
          <MusicAnalysisCard
            tempoBpm={track.metadata.tempo_bpm as number | undefined}
            keySignature={track.metadata.key_signature as string | undefined}
            instruments={track.metadata.instruments as string[] | undefined}
            energyLevel={track.metadata.energy_level as number | undefined}
            danceability={track.metadata.danceability as number | undefined}
            valence={track.metadata.valence as number | undefined}
          />
        )}

        {/* Style Recommendations (AI) */}
        <StyleRecommendationsPanel
          mood={track.mood || ''}
          genre={track.genre || ''}
          currentTags={track.style_tags || []}
          className="bg-card"
        />

        {/* Reference Sources */}
        <ReferenceSourcesPanel
          metadata={track.metadata || {}}
          trackId={track.id}
          className="bg-card"
        />

        {/* Prompts (Collapsible) */}
        <PromptsCard
          prompt={track.prompt}
          improvedPrompt={track.improved_prompt}
        />
      </div>
    </ScrollArea>
  );
};
