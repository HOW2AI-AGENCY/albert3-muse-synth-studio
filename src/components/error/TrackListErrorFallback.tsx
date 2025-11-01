/**
 * Track List Error Fallback
 * Специализированный fallback для ошибок в списке треков
 */

import { Music } from 'lucide-react';

interface TrackListErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export function TrackListErrorFallback({ error, reset }: TrackListErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 mb-4 rounded-full bg-destructive/10">
        <Music className="h-10 w-10 text-destructive" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2">Ошибка загрузки треков</h3>
      
      <p className="text-sm text-muted-foreground max-w-sm text-center mb-4">
        Не удалось загрузить список треков. Пожалуйста, попробуйте обновить страницу.
      </p>
      
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-destructive mb-4 font-mono">
          {error.message}
        </p>
      )}
      
      <button
        onClick={reset}
        className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
      >
        Попробовать снова
      </button>
    </div>
  );
}

TrackListErrorFallback.displayName = 'TrackListErrorFallback';
