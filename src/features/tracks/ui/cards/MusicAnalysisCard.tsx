/**
 * Music Analysis Card
 * Display musical analysis with metrics
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricBar } from './MetricBar';
import { Music, Key, Drum } from 'lucide-react';

interface MusicAnalysisCardProps {
  tempoBpm?: number;
  keySignature?: string;
  instruments?: string[];
  energyLevel?: number;
  danceability?: number;
  valence?: number;
}

export const MusicAnalysisCard = ({
  tempoBpm,
  keySignature,
  instruments,
  energyLevel,
  danceability,
  valence,
}: MusicAnalysisCardProps) => {
  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Music className="h-4 w-4 text-primary" />
          Музыкальный анализ
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Info */}
        <div className="space-y-2">
          {tempoBpm && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Темп</span>
              <span className="font-medium">{tempoBpm} BPM</span>
            </div>
          )}

          {keySignature && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Key className="h-3 w-3" />
                Тональность
              </span>
              <span className="font-medium">{keySignature}</span>
            </div>
          )}

          {instruments && instruments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Drum className="h-3 w-3" />
                Инструменты
              </p>
              <div className="flex flex-wrap gap-1.5">
                {instruments.map((instrument, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {instrument}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Metrics */}
        {(energyLevel !== undefined || danceability !== undefined || valence !== undefined) && (
          <div className="space-y-3 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">Характеристики</p>
            
            {energyLevel !== undefined && (
              <MetricBar label="Энергия" value={energyLevel} max={100} />
            )}

            {danceability !== undefined && (
              <MetricBar label="Танцевальность" value={danceability} max={100} />
            )}

            {valence !== undefined && (
              <MetricBar label="Позитивность" value={valence} max={100} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
