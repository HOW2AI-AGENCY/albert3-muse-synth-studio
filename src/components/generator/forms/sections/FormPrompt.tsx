import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FeatureGate } from '@/components/subscription/FeatureGate';
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
        <div className="space-y-[var(--space-2)] p-[var(--space-compact-md)] sm:p-[var(--space-comfortable-sm)]">
            <div className="flex items-center gap-[var(--space-2)] mb-[var(--space-1)]">
                <div className="w-1 h-5 bg-gradient-to-b from-primary to-primary/50 rounded-full" aria-hidden="true" />
                <Label htmlFor="custom-prompt" className="text-sm font-semibold">
                    Описание стиля
                </Label>
            </div>
            <div className="relative">
                <Textarea
                    id="custom-prompt"
                    placeholder="Опишите стиль, жанр, настроение..."
                    value={debouncedPrompt}
                    onChange={(e) => onDebouncedPromptChange(e.target.value)}
                    disabled={isGenerating}
                    className={cn(
                        "pr-12 resize-y min-h-[70px] sm:min-h-[80px] max-h-[300px] mobile-input touch-target-min",
                        promptError && "border-destructive focus-visible:ring-destructive"
                    )}
                    maxLength={MAX_PROMPT_LENGTH}
                    aria-label="Описание стиля музыки"
                    aria-invalid={promptError}
                    aria-describedby={promptError ? "prompt-error" : "prompt-counter"}
                />
                {onBoostPrompt && debouncedPrompt.trim() && (
                    <FeatureGate feature="ai_field_actions" fallback={<></>}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-2 touch-target-min text-primary hover:text-primary hover:bg-primary/10"
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
                    </FeatureGate>
                )}
            </div>
            {promptError && (
                <p id="prompt-error" className="text-xs text-destructive" role="alert">
                    Превышен лимит в {MAX_PROMPT_LENGTH} символов.
                </p>
            )}
            <div className="flex items-center justify-between pt-[var(--space-1)]">
                <div className="flex items-center gap-[var(--space-2)]">
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
