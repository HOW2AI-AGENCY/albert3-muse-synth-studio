/**
 * Technical Details Card
 * Display technical metadata
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Calendar, Clock } from 'lucide-react';
import { formatDate, formatDuration } from '@/utils/formatters';

interface TechnicalDetailsCardProps {
  provider: string;
  model?: string | null;
  sunoId?: string | null;
  createdAt: string;
  duration?: number | null;
}

export const TechnicalDetailsCard = ({
  provider,
  model,
  sunoId,
  createdAt,
  duration,
}: TechnicalDetailsCardProps) => {
  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          Технические детали
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Провайдер</span>
          <span className="font-medium">{provider.toUpperCase()}</span>
        </div>

        {model && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Модель</span>
            <span className="font-medium">{model}</span>
          </div>
        )}

        {sunoId && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Suno ID</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">{sunoId.slice(0, 8)}...</code>
          </div>
        )}

        {duration && (
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Длительность
            </span>
            <span className="font-medium">{formatDuration(duration)}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          <span className="text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Создано
          </span>
          <span className="font-medium text-xs">{formatDate(createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
};
