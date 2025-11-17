/**
 * Prompts Card
 * Display generation prompts (collapsible)
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, FileText } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PromptsCardProps {
  prompt: string;
  improvedPrompt?: string | null;
}

export const PromptsCard = ({ prompt, improvedPrompt }: PromptsCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="bg-muted/30 border-border/40">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Промпты генерации
              </span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Original Prompt */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Исходный промпт</p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <pre className="whitespace-pre-wrap font-mono text-xs">{prompt}</pre>
              </div>
            </div>

            {/* Improved Prompt */}
            {improvedPrompt && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Улучшенный промпт</p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                  <pre className="whitespace-pre-wrap font-mono text-xs">{improvedPrompt}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
