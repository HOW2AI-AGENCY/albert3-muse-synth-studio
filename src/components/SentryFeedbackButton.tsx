import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

export const SentryFeedbackButton = () => {
  const handleClick = () => {
    const feedback = Sentry.getFeedback();
    if (feedback) {
      feedback.createWidget();
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="fixed bottom-20 right-4 z-50 shadow-lg hover:shadow-xl transition-shadow"
      aria-label="Сообщить о проблеме"
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      <span className="hidden sm:inline">Сообщить о проблеме</span>
    </Button>
  );
};
