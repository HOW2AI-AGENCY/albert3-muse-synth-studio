import { AlertCircle, Clock, CreditCard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatRemainingTime } from "@/hooks/useRateLimitHandler";

interface AIErrorAlertProps {
  error: {
    status?: number;
    message: string;
  };
  remainingTime?: number;
  onRetry?: () => void;
  onNavigateToUsage?: () => void;
  className?: string;
}

export function AIErrorAlert({
  error,
  remainingTime,
  onRetry,
  onNavigateToUsage,
  className
}: AIErrorAlertProps) {
  const isRateLimit = error.status === 429;
  const isPaymentRequired = error.status === 402;
  const isServerError = error.status === 500 || error.status === 503;

  // Calculate progress for rate limit countdown
  const progress = remainingTime 
    ? ((60 - remainingTime) / 60) * 100 
    : 0;

  if (isRateLimit && remainingTime !== undefined) {
    return (
      <Alert variant="destructive" className={className}>
        <Clock className="h-4 w-4" />
        <AlertTitle>Превышен лимит запросов</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>Слишком много запросов к AI сервису. Пожалуйста, подождите.</p>
          
          {/* Countdown timer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Повтор через:</span>
              <span className="font-mono font-semibold">
                {formatRemainingTime(remainingTime)}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {onRetry && remainingTime <= 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRetry}
              className="w-full"
            >
              Повторить сейчас
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isPaymentRequired) {
    return (
      <Alert variant="destructive" className={className}>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>Недостаточно AI кредитов</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            У вас закончились AI кредиты. Пополните баланс, чтобы продолжить использование AI функций.
          </p>
          
          {onNavigateToUsage && (
            <Button 
              variant="default" 
              size="sm"
              onClick={onNavigateToUsage}
              className="w-full"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Пополнить кредиты
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (isServerError) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>AI сервис временно недоступен</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            Не удалось подключиться к AI сервису. Используется упрощенное улучшение промпта.
          </p>
          
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onRetry}
              className="w-full"
            >
              Попробовать снова
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Generic error
  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Ошибка AI генерации</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{error.message}</p>
        
        {onRetry && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onRetry}
            className="w-full"
          >
            Попробовать снова
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
