import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const WarningCard: React.FC = () => (
  <Card className="border-yellow-500/50 bg-yellow-500/5">
    <CardContent className="flex items-start gap-3 pt-6">
      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">Экспериментальная функция</p>
        <p className="text-sm text-muted-foreground">
          Prompt DJ использует Google Gemini Lyria API (v1alpha). Функциональность может работать нестабильно.
          Для полноценной работы требуется активный API ключ Google AI.
        </p>
      </div>
    </CardContent>
  </Card>
);
