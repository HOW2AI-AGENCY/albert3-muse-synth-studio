/**
 * Overview Tab Content
 * Main information: stats, genre/mood, prompts, technical details, AI analysis
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PromptCard } from '../cards/PromptCard';
import { TechnicalDetailsCard } from '../cards/TechnicalDetailsCard';
import { AIAnalysisCard } from '../cards/AIAnalysisCard';
import { Music2, Trash2 } from 'lucide-react';
import type { Track } from '@/types/domain/track.types';

interface OverviewContentProps {
  track: Track;
  onDelete?: () => void;
}

export const OverviewContent = ({ track, onDelete }: OverviewContentProps) => {
  // Check if we have any metadata to display
  const hasMetadata = track.metadata && Object.keys(track.metadata).length > 0;
  const hasStats = track.view_count || track.play_count || track.download_count || track.like_count;

  return (
    <div className="space-y-4">
      {/* Stats Card */}
      {hasStats && (
        <Card className="bg-muted/30 border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Music2 className="h-4 w-4 text-primary" />
              Статистика
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {track.view_count !== null && track.view_count !== undefined && (
              <div>
                <div className="text-muted-foreground text-xs">Просмотров</div>
                <div className="font-semibold text-lg">{track.view_count}</div>
              </div>
            )}
            {track.play_count !== null && track.play_count !== undefined && (
              <div>
                <div className="text-muted-foreground text-xs">Воспроизведений</div>
                <div className="font-semibold text-lg">{track.play_count}</div>
              </div>
            )}
            {track.like_count !== null && track.like_count !== undefined && (
              <div>
                <div className="text-muted-foreground text-xs">Лайков</div>
                <div className="font-semibold text-lg">{track.like_count}</div>
              </div>
            )}
            {track.download_count !== null && track.download_count !== undefined && (
              <div>
                <div className="text-muted-foreground text-xs">Загрузок</div>
                <div className="font-semibold text-lg">{track.download_count}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Analysis */}
      <AIAnalysisCard trackId={track.id} />

      {/* Generation Prompts */}
      <PromptCard
        prompt={track.prompt}
        improvedPrompt={track.improved_prompt}
      />

      {/* Provider Metadata */}
      {hasMetadata && (
        <Card className="bg-muted/30 border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Метаданные от {track.provider?.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {track.metadata && Object.entries(track.metadata).map(([key, value]) => {
              // Format value based on type
              let displayValue: string;

              if (value === null || value === undefined) {
                displayValue = '—';
              } else if (typeof value === 'boolean') {
                displayValue = value ? 'Да' : 'Нет';
              } else if (typeof value === 'number') {
                // Format numbers with commas
                displayValue = value.toLocaleString('ru-RU');
              } else if (typeof value === 'object') {
                // Handle arrays
                if (Array.isArray(value)) {
                  displayValue = value.join(', ');
                }
                // Handle dates
                else if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value))) {
                  try {
                    const date = new Date(value as any);
                    displayValue = date.toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                  } catch {
                    displayValue = String(value);
                  }
                }
                // Handle duration objects
                else if ('duration' in value) {
                  displayValue = `${value.duration} сек`;
                }
                // Handle audio_url objects
                else if ('audio_url' in value) {
                  displayValue = '🎵 Аудио';
                }
                // Fallback: show only keys for complex objects
                else {
                  const keys = Object.keys(value);
                  displayValue = keys.length > 0 ? `${keys.length} полей` : '—';
                }
              } else {
                displayValue = String(value);
              }

              return (
                <div key={key} className="flex justify-between items-start gap-2">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="font-medium text-right break-all max-w-[60%]">
                    {displayValue}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Technical Details */}
      <TechnicalDetailsCard
        provider={track.provider || 'suno'}
        model={track.model_name}
        sunoId={track.suno_id}
        createdAt={track.created_at}
        duration={track.duration_seconds}
      />

      {/* Delete Button - Safe location at bottom */}
      {onDelete && (
        <Card className="bg-destructive/5 border-destructive/20">
          <CardContent className="pt-4 pb-4">
            <Button
              variant="destructive"
              className="w-full touch-target-min"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить трек
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Это действие необратимо
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
