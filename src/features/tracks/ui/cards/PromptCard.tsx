/**
 * Prompt Card
 * Display generation prompt and improved prompt
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PromptCardProps {
  prompt?: string | null;
  improvedPrompt?: string | null;
}

export const PromptCard = ({ prompt, improvedPrompt }: PromptCardProps) => {
  if (!prompt && !improvedPrompt) return null;

  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Промпты генерации
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {prompt && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-xs">
                Оригинальный
              </Badge>
            </div>
            <p className="text-sm text-foreground/90 bg-background/50 rounded-md p-2.5 leading-relaxed">
              {prompt}
            </p>
          </div>
        )}

        {improvedPrompt && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                Улучшенный AI
              </Badge>
            </div>
            <p className="text-sm text-foreground/90 bg-gradient-to-br from-primary/5 to-primary/10 rounded-md p-2.5 leading-relaxed border border-primary/20">
              {improvedPrompt}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
