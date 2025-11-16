import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, History } from '@/utils/iconImports';
import { PromptCharacterCounter } from '@/components/generator/PromptCharacterCounter';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

const MAX_PROMPT_LENGTH = 3000;

interface FormPromptProps {
    debouncedPrompt: string;
    onDebouncedPromptChange: (value: string) => void;
    onBoostPrompt?: () => void;
    onOpenHistory?: () => void;
    isBoosting?: boolean;
    isGenerating: boolean;
    promptError: boolean;
}

export const FormPrompt = ({
    debouncedPrompt,
    onDebouncedPromptChange,
    onBoostPrompt,
    onOpenHistory,
    isBoosting = false,
    isGenerating,
    promptError
}: FormPromptProps) => {

    return (
        <div className="space-y-1.5 p-2">
            <div className="relative">
                <Textarea
                    id="custom-prompt"
                    placeholder="Опишите стиль, жанр, настроение..."
                    value={debouncedPrompt}
                    onChange={(e) => onDebouncedPromptChange(e.target.value)}
                    disabled={isGenerating}
                    className={cn(
                        "pr-10 resize-y min-h-[70px] sm:min-h-[80px] max-h-[300px] mobile-input",
                        promptError && "border-destructive focus-visible:ring-destructive"
                    )}
                    maxLength={MAX_PROMPT_LENGTH}
                    aria-label="Описание стиля музыки"
                />
                {onBoostPrompt && debouncedPrompt.trim() && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-2 touch-target-min text-primary hover:text-primary hover:bg-primary/10"
                                onClick={onBoostPrompt}
                                disabled={isBoosting || isGenerating}
                                aria-label="Улучшить промпт с помощью AI"
                            >
                                <Sparkles className={cn("h-4 w-4", isBoosting && "animate-spin")} aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p className="text-xs">Улучшить промпт с помощью AI</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
            {promptError && (
                <p className="text-xs text-destructive">
                    Превышен лимит в {MAX_PROMPT_LENGTH} символов.
                </p>
            )}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                    <PromptCharacterCounter
                        currentLength={debouncedPrompt.length}
                        maxLength={MAX_PROMPT_LENGTH}
                    />
                    <InfoTooltip content="Опишите стиль, жанр, настроение, темп и инструменты. Чем детальнее описание, тем точнее результат." />
                </div>
                {onOpenHistory && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onOpenHistory}
                                disabled={isGenerating}
                                className="touch-target-min"
                                aria-label="История промптов"
                            >
                                <History className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            <p className="text-xs">История промптов</p>
                        </TooltipContent>
                    </Tooltip>
                )}
            </div>
        </div>
    );
};
