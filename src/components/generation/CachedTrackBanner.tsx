/**
 * Banner component to inform users about cached tracks
 * Provides option to force new generation
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface CachedTrackBannerProps {
  onForceNew: () => void;
  onViewTrack: () => void;
}

export const CachedTrackBanner = ({ 
  onForceNew, 
  onViewTrack 
}: CachedTrackBannerProps) => {
  return (
    <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="text-blue-900 dark:text-blue-100">
        ⚡ Трек найден!
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-blue-800 dark:text-blue-200">
          Используется ранее созданный трек с такими же параметрами. 
          Это экономит ваши кредиты!
        </p>
        
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={onViewTrack}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Открыть трек
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onForceNew}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            Создать новый вместо этого
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
