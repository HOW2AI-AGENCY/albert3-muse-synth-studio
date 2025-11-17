/**
 * AI Analysis Card
 * Display AI-generated song description and analysis from song_descriptions table
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Music, Gauge, Heart, Activity } from 'lucide-react';
import { useSongDescription } from '@/hooks/useSongDescription';

interface AIAnalysisCardProps {
  trackId: string;
}

export const AIAnalysisCard = ({ trackId }: AIAnalysisCardProps) => {
  const { data: description, isLoading } = useSongDescription(trackId);

  if (isLoading) {
    return (
      <Card className="bg-muted/30 border-border/40 animate-pulse">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-spin" />
            AI Анализ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!description || description.status !== 'completed') {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Анализ композиции
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Description */}
        {description.ai_description && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Описание</p>
            <p className="text-sm text-foreground/90 leading-relaxed">
              {description.ai_description}
            </p>
          </div>
        )}

        {/* Genre & Mood */}
        {(description.detected_genre || description.detected_mood) && (
          <div className="flex flex-wrap gap-2">
            {description.detected_genre && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <Music className="h-3 w-3 mr-1" />
                {description.detected_genre}
              </Badge>
            )}
            {description.detected_mood && (
              <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
                <Heart className="h-3 w-3 mr-1" />
                {description.detected_mood}
              </Badge>
            )}
          </div>
        )}

        {/* Instruments */}
        {description.detected_instruments && description.detected_instruments.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Инструменты</p>
            <div className="flex flex-wrap gap-1.5">
              {description.detected_instruments.map((instrument, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {instrument}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Audio Characteristics */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
          {description.tempo_bpm && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Activity className="h-3 w-3" />
                BPM
              </span>
              <span className="font-medium">{description.tempo_bpm}</span>
            </div>
          )}

          {description.key_signature && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Тональность</span>
              <span className="font-medium">{description.key_signature}</span>
            </div>
          )}

          {description.energy_level !== null && description.energy_level !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                Энергия
              </span>
              <span className="font-medium">{description.energy_level}/100</span>
            </div>
          )}

          {description.danceability !== null && description.danceability !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Танцевальность</span>
              <span className="font-medium">{description.danceability}/100</span>
            </div>
          )}

          {description.valence !== null && description.valence !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Позитивность</span>
              <span className="font-medium">{description.valence}/100</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
