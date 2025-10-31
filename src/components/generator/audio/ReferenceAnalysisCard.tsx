/**
 * @fileoverview Компонент для отображения результатов анализа референсного аудио
 * @description
 * Показывает результаты распознавания песни (Recognition) и AI-описания (Description)
 * с кнопками для автоматического применения данных к форме генерации.
 * 
 * @module ReferenceAnalysisCard
 * @version 1.0.0
 * @since 2025-10-15
 */

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Music, Sparkles, Check, AlertCircle } from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import type { SongRecognition, SongDescription } from '@/hooks/useReferenceAnalysis';

// ============================================================================
// INTERFACES
// ============================================================================

interface ReferenceAnalysisCardProps {
  /** Результаты распознавания песни */
  recognition: SongRecognition | null;
  /** Результаты AI-описания */
  description: SongDescription | null;
  /** Идет ли процесс анализа */
  isAnalyzing: boolean;
  /** Идет ли polling результатов */
  isPolling: boolean;
  /** Callback для применения названия */
  onApplyTitle?: (title: string, artist?: string) => void;
  /** Callback для применения характеристик */
  onApplyCharacteristics?: (characteristics: {
    genre?: string;
    mood?: string;
    tempo?: number;
    instruments?: string[];
    description?: string;
  }) => void;
  /** Callback для применения всего сразу */
  onApplyAll?: () => void;
  /** Дополнительные классы */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ReferenceAnalysisCard = memo(({
  recognition,
  description,
  isAnalyzing,
  isPolling,
  onApplyTitle,
  onApplyCharacteristics,
  onApplyAll,
  className
}: ReferenceAnalysisCardProps) => {
  // ============================================================================
  // RENDER: Loading State
  // ============================================================================

  if (isAnalyzing || (isPolling && !recognition && !description)) {
    return (
      <Card className={cn("border-primary/20 bg-primary/5", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            AI Анализ референса
          </CardTitle>
          <CardDescription className="text-xs">
            Распознаём и анализируем аудио...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors",
              recognition?.status === 'completed' 
                ? 'bg-success' 
                : 'bg-primary animate-pulse'
            )} />
            <span className={recognition?.status === 'completed' ? 'text-success' : 'text-muted-foreground'}>
              {recognition?.status === 'completed' ? '✓ Трек распознан' : 'Идентификация трека...'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className={cn(
              "h-2 w-2 rounded-full transition-colors",
              description?.status === 'completed' 
                ? 'bg-success' 
                : 'bg-primary animate-pulse'
            )} />
            <span className={description?.status === 'completed' ? 'text-success' : 'text-muted-foreground'}>
              {description?.status === 'completed' ? '✓ Характеристики получены' : 'AI-анализ характеристик...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: No Results Yet
  // ============================================================================

  if (!recognition && !description) {
    return null;
  }

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const hasRecognitionData = recognition?.status === 'completed' && recognition.recognized_title;
  const hasDescriptionData = description?.status === 'completed' && description.detected_genre;
  const hasAnyData = hasRecognitionData || hasDescriptionData;
  const hasFailed = recognition?.status === 'failed' && description?.status === 'failed';

  // ============================================================================
  // RENDER: Failed State
  // ============================================================================

  if (hasFailed && !hasAnyData) {
    return (
      <Card className={cn("border-destructive/30 bg-destructive/5", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Анализ не удался
          </CardTitle>
          <CardDescription className="text-xs text-destructive/80">
            {recognition?.error_message || description?.error_message || 'Не удалось проанализировать аудио'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // ============================================================================
  // RENDER: Results
  // ============================================================================

  return (
    <Card className={cn("border-success/30 bg-success/5", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-success" />
          AI Анализ референса
        </CardTitle>
        <CardDescription className="text-xs">
          Автоматически распознанные данные
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Recognition Results */}
        {hasRecognitionData && (
          <div className="space-y-2 p-3 rounded-md bg-background/50 border border-border/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Music className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground">Распознано</span>
                  {recognition.confidence_score && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {Math.round(recognition.confidence_score * 100)}%
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold truncate">
                  {recognition.recognized_title}
                </p>
                {recognition.recognized_artist && (
                  <p className="text-xs text-muted-foreground truncate">
                    {recognition.recognized_artist}
                  </p>
                )}
                {recognition.recognized_album && (
                  <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">
                    {recognition.recognized_album}
                  </p>
                )}
              </div>
              {onApplyTitle && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => onApplyTitle(
                    recognition.recognized_title || '',
                    recognition.recognized_artist || undefined
                  )}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Применить
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Description Results */}
        {hasDescriptionData && (
          <div className="space-y-2 p-3 rounded-md bg-background/50 border border-border/50">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs font-medium text-muted-foreground">AI-описание</span>
                </div>

                {/* Genre & Mood */}
                <div className="flex flex-wrap gap-1.5">
                  {description.detected_genre && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {description.detected_genre}
                    </Badge>
                  )}
                  {description.detected_mood && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {description.detected_mood}
                    </Badge>
                  )}
                  {description.tempo_bpm && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {description.tempo_bpm} BPM
                    </Badge>
                  )}
                  {description.key_signature && (
                    <Badge variant="outline" className="text-[10px] h-5">
                      {description.key_signature}
                    </Badge>
                  )}
                </div>

                {/* Instruments */}
                {description.detected_instruments && description.detected_instruments.length > 0 && (
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <span>Инструменты:</span>
                    {description.detected_instruments.map((instrument, idx) => (
                      <span key={idx} className="font-medium">
                        {instrument}{idx < description.detected_instruments!.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* AI Description */}
                {description.ai_description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {description.ai_description}
                  </p>
                )}

                {/* Energy & Metrics */}
                {(description.energy_level || description.danceability || description.valence) && (
                  <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    {description.energy_level !== null && description.energy_level !== undefined && (
                      <span>Энергия: {Math.round(description.energy_level * 100)}%</span>
                    )}
                    {description.danceability !== null && description.danceability !== undefined && (
                      <span>Танцевальность: {Math.round(description.danceability * 100)}%</span>
                    )}
                    {description.valence !== null && description.valence !== undefined && (
                      <span>Позитивность: {Math.round(description.valence * 100)}%</span>
                    )}
                  </div>
                )}
              </div>

              {onApplyCharacteristics && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => onApplyCharacteristics({
                    genre: description.detected_genre || undefined,
                    mood: description.detected_mood || undefined,
                    tempo: description.tempo_bpm || undefined,
                    instruments: description.detected_instruments || undefined,
                    description: description.ai_description || undefined,
                  })}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Применить
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Polling Status */}
        {isPolling && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Обновление результатов...</span>
          </div>
        )}

        {/* Apply All Button */}
        {(hasRecognitionData || hasDescriptionData) && onApplyAll && (
          <Button
            size="sm"
            className="w-full mt-2"
            onClick={onApplyAll}
          >
            <Check className="h-4 w-4 mr-2" />
            Применить всё к форме генерации
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

ReferenceAnalysisCard.displayName = 'ReferenceAnalysisCard';
