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
    <Button variant="outline" size="sm" onClick={handleClick}>
      <MessageSquare className="h-4 w-4 mr-2" />
      Обратная связь
    </Button>
  );
};