/**
 * AI Description Card
 * Display AI-generated track description
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot } from 'lucide-react';

interface AIDescriptionCardProps {
  description: string;
}

export const AIDescriptionCard = ({ description }: AIDescriptionCardProps) => {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          AI-описание композиции
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-foreground/90">{description}</p>
      </CardContent>
    </Card>
  );
};
