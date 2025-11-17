/**
 * AI Field Improvement Component
 * @version 1.0.0
 * 
 * Provides AI-powered actions (improve, generate, rewrite) for text fields
 */

import { memo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, Wand2, RefreshCw, Loader2 } from 'lucide-react';
import { useAIImproveField, type AIAction } from '@/hooks/useAIImproveField';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AIFieldImprovementProps {
  field: string;
  value: string;
  context?: string;
  additionalContext?: Record<string, any>;
  onResult: (result: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const AIFieldImprovement = memo(({
  field,
  value,
  context,
  additionalContext,
  onResult,
  disabled = false,
  className,
  variant = 'ghost',
  size = 'sm',
}: AIFieldImprovementProps) => {
  const { toast } = useToast();
  const [currentAction, setCurrentAction] = useState<AIAction | null>(null);

  const { improveField, isImproving } = useAIImproveField({
    onSuccess: (result) => {
      onResult(result);
      toast({
        title: '✨ AI улучшил поле',
        description: `${field} успешно обработано`,
      });
    },
    onError: (error) => {
      toast({
        title: '❌ Ошибка AI',
        description: error,
        variant: 'destructive',
      });
    },
  });

  const handleAction = async (action: AIAction) => {
    if (!value && action !== 'generate') {
      toast({
        title: 'Поле пустое',
        description: 'Введите текст для улучшения или перепишите',
        variant: 'destructive',
      });
      return;
    }

    setCurrentAction(action);
    await improveField({
      field,
      value,
      action,
      context,
      additionalContext,
    });
    setCurrentAction(null);
  };

  const getActionIcon = (action: AIAction) => {
    switch (action) {
      case 'improve':
        return <Sparkles className="h-4 w-4" />;
      case 'generate':
        return <Wand2 className="h-4 w-4" />;
      case 'rewrite':
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getActionLabel = (action: AIAction) => {
    switch (action) {
      case 'improve':
        return 'Улучшить';
      case 'generate':
        return 'Сгенерировать';
      case 'rewrite':
        return 'Переписать';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isImproving}
          className={cn('gap-2', className)}
        >
          {isImproving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>AI работает...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              <span>AI</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {(['improve', 'generate', 'rewrite'] as AIAction[]).map((action) => (
          <DropdownMenuItem
            key={action}
            onClick={() => handleAction(action)}
            disabled={isImproving}
            className="gap-2 cursor-pointer"
          >
            {currentAction === action ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              getActionIcon(action)
            )}
            <span>{getActionLabel(action)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

AIFieldImprovement.displayName = 'AIFieldImprovement';
