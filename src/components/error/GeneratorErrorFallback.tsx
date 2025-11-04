/**
 * Generator Error Fallback
 * Специализированный fallback для ошибок в генераторе музыки
 */

import { AlertCircle } from 'lucide-react';

interface GeneratorErrorFallbackProps {
  error: Error;
  reset: () => void;
}

export const GeneratorErrorFallback = ({ error, reset }: GeneratorErrorFallbackProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg bg-destructive/5">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      
      <h3 className="text-lg font-semibold mb-2">Ошибка генератора</h3>
      
      <p className="text-sm text-muted-foreground max-w-md text-center mb-4">
        Произошла ошибка при инициализации генератора музыки. 
        Попробуйте обновить страницу или вернуться позже.
      </p>
      
      {process.env.NODE_ENV === 'development' && (
        <details className="mb-4 w-full max-w-md">
          <summary className="cursor-pointer text-sm font-medium text-center">
            Техническая информация
          </summary>
          <pre className="mt-2 p-4 text-xs bg-muted rounded-md overflow-auto max-h-32">
            {error.stack}
          </pre>
        </details>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Попробовать снова
        </button>
        
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-accent"
        >
          Обновить страницу
        </button>
      </div>
    </div>
  );
};

GeneratorErrorFallback.displayName = 'GeneratorErrorFallback';
