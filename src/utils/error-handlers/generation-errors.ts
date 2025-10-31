import { toast } from 'sonner';

interface RateLimitError {
  errorCode: 'RATE_LIMIT_EXCEEDED';
  retryAfter?: number;
  error: string;
}

interface InsufficientCreditsError {
  errorCode: 'INSUFFICIENT_CREDITS';
  error: string;
}

export type GenerationError = RateLimitError | InsufficientCreditsError | Error;

export const handleGenerationError = (error: unknown): void => {
  if (!error || typeof error !== 'object') {
    toast.error('Произошла неизвестная ошибка');
    return;
  }

  const err = error as Record<string, any>;

  // Handle rate limit errors (429)
  if (err.errorCode === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = err.retryAfter || 60;
    const minutes = Math.ceil(retryAfter / 60);
    
    toast.error('Превышен лимит запросов', {
      description: `Попробуйте снова через ${minutes} ${minutes === 1 ? 'минуту' : 'минуты'}`,
      duration: 5000,
    });
    return;
  }

  // Handle insufficient credits errors (402)
  if (err.errorCode === 'INSUFFICIENT_CREDITS') {
    toast.error('Недостаточно кредитов', {
      description: 'Пожалуйста, пополните баланс или обновите план',
      duration: 5000,
      action: {
        label: 'Пополнить',
        onClick: () => {
          // Navigate to billing page
          window.location.href = '/workspace/settings?tab=billing';
        },
      },
    });
    return;
  }

  // Handle other errors
  const message = err.error && typeof err.error === 'string' 
    ? err.error 
    : 'Произошла ошибка при генерации';
    
  toast.error(message, {
    duration: 4000,
  });
};

export const isRateLimitError = (error: unknown): error is RateLimitError => {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, any>;
  return err.errorCode === 'RATE_LIMIT_EXCEEDED';
};

export const isInsufficientCreditsError = (error: unknown): error is InsufficientCreditsError => {
  if (!error || typeof error !== 'object') return false;
  const err = error as Record<string, any>;
  return err.errorCode === 'INSUFFICIENT_CREDITS';
};
