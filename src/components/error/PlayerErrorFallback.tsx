/**
 * Player Error Fallback
 * Специализированный fallback для ошибок в аудиоплеере
 */

import { Play } from 'lucide-react';

interface PlayerErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export function PlayerErrorFallback({ error, reset }: PlayerErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-destructive/10">
          <Play className="h-5 w-5 text-destructive" />
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium">Ошибка плеера</p>
          <p className="text-xs text-muted-foreground">
            {error.message || 'Не удалось инициализировать аудиоплеер'}
          </p>
        </div>
        
        <button
          onClick={reset}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Перезагрузить
        </button>
      </div>
    </div>
  );
}

PlayerErrorFallback.displayName = 'PlayerErrorFallback';
