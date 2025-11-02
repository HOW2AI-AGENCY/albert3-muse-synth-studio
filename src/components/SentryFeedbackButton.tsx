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
  return;
};