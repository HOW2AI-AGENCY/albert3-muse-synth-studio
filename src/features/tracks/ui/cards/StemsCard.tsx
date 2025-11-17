/**
 * Stems Card
 * Display track stems preview
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MinimalStemsList } from '../MinimalStemsList';
import { Waves } from 'lucide-react';

interface StemsCardProps {
  trackId: string;
}

export const StemsCard = ({ trackId }: StemsCardProps) => {
  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Waves className="h-4 w-4 text-primary" />
          Стемы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <MinimalStemsList trackId={trackId} />
      </CardContent>
    </Card>
  );
};
